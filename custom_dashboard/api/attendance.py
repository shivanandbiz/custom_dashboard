import frappe
from frappe import _
from datetime import datetime, time
import json

@frappe.whitelist()
def get_employee_details():
    """Get current logged-in employee details"""
    try:
        user = frappe.session.user
        
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user, "status": "Active"},
            ["name", "employee_name", "company", "department"],
            as_dict=True
        )
        
        if not employee:
            return {
                "success": False,
                "message": _("No active employee found for this user")
            }
        
        return {
            "success": True,
            "employee": employee
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Get Employee Details Error"))
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def get_today_status():
    """Get today's check-in status and last check-in/out details"""
    try:
        user = frappe.session.user
        
        employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
        
        if not employee:
            return {
                "success": False,
                "message": _("Employee not found")
            }
        
        today = frappe.utils.today()
        
        # Get last check-in log for today
        last_log = frappe.db.get_all(
            "Employee Checkin",
            filters={
                "employee": employee,
                "time": [">=", today],
            },
            fields=["name", "time", "log_type", "device_id"],
            order_by="time desc",
            limit=1
        )
        
        # Get all check-ins for today to calculate total hours
        all_logs = frappe.db.get_all(
            "Employee Checkin",
            filters={
                "employee": employee,
                "time": [">=", today],
            },
            fields=["time", "log_type"],
            order_by="time asc"
        )
        
        # Calculate working hours
        total_hours = calculate_working_hours(all_logs)
        
        status = {
            "success": True,
            "employee": employee,
            "last_action": last_log[0].get("log_type") if last_log else None,
            "last_time": last_log[0].get("time") if last_log else None,
            "is_checked_in": last_log[0].get("log_type") == "IN" if last_log else False,
            "total_hours": total_hours,
            "total_logs": len(all_logs)
        }
        
        return status
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Get Today Status Error"))
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def check_in():
    """Create check-in log"""
    try:
        user = frappe.session.user
        
        employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
        
        if not employee:
            return {
                "success": False,
                "message": _("Employee not found")
            }
        
        # Check if already checked in
        today_status = get_today_status()
        
        if today_status.get("is_checked_in"):
            return {
                "success": False,
                "message": _("You are already checked in")
            }
        
        # Create new check-in
        checkin = frappe.get_doc({
            "doctype": "Employee Checkin",
            "employee": employee,
            "log_type": "IN",
            "time": frappe.utils.now_datetime(),
            "device_id": "Web Dashboard"
        })
        
        checkin.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Checked in successfully"),
            "time": checkin.time
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Check In Error"))
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def check_out():
    """Create check-out log"""
    try:
        user = frappe.session.user
        
        employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
        
        if not employee:
            return {
                "success": False,
                "message": _("Employee not found")
            }
        
        # Check if already checked out
        today_status = get_today_status()
        
        if not today_status.get("is_checked_in"):
            return {
                "success": False,
                "message": _("You need to check in first")
            }
        
        # Create new check-out
        checkout = frappe.get_doc({
            "doctype": "Employee Checkin",
            "employee": employee,
            "log_type": "OUT",
            "time": frappe.utils.now_datetime(),
            "device_id": "Web Dashboard"
        })
        
        checkout.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Checked out successfully"),
            "time": checkout.time
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Check Out Error"))
        return {
            "success": False,
            "message": str(e)
        }


def calculate_working_hours(logs):
    """Calculate total working hours from check-in/out logs"""
    if not logs or len(logs) < 2:
        return 0
    
    total_seconds = 0
    in_time = None
    
    for log in logs:
        if log.get("log_type") == "IN":
            in_time = log.get("time")
        elif log.get("log_type") == "OUT" and in_time:
            out_time = log.get("time")
            diff = (out_time - in_time).total_seconds()
            total_seconds += diff
            in_time = None
    
    # If still checked in, calculate till now
    if in_time:
        now = datetime.now()
        diff = (now - in_time).total_seconds()
        total_seconds += diff
    
    total_hours = round(total_seconds / 3600, 2)
    return total_hours


@frappe.whitelist()
def get_attendance_history(limit=10):
    """Get recent attendance history"""
    try:
        user = frappe.session.user
        
        employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
        
        if not employee:
            return {
                "success": False,
                "message": _("Employee not found")
            }
        
        logs = frappe.db.get_all(
            "Employee Checkin",
            filters={"employee": employee},
            fields=["time", "log_type", "device_id"],
            order_by="time desc",
            limit=limit
        )
        
        return {
            "success": True,
            "logs": logs
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Get Attendance History Error"))
        return {
            "success": False,
            "message": str(e)
        }