# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.query_builder.functions import Concat_ws, Date


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	
	period_sort_map = {}
	for row in data:
		if row.get("creation"):
			creation_date = frappe.utils.getdate(row["creation"])
			if filters.get("period") == "Weekly":
				row["period"] = "Week {} {}".format(int(creation_date.strftime("%W")), creation_date.strftime("%Y"))
				period_sort_map[row["period"]] = creation_date.strftime("%Y-%W")
			elif filters.get("period") == "Quarterly":
				quarter = (creation_date.month - 1) // 3 + 1
				row["period"] = "Q{} {}".format(quarter, creation_date.strftime("%Y"))
				period_sort_map[row["period"]] = "{}-Q{}".format(creation_date.strftime("%Y"), quarter)
			elif filters.get("period") == "Yearly":
				row["period"] = creation_date.strftime("%Y")
				period_sort_map[row["period"]] = creation_date.strftime("%Y")
			else:
				row["period"] = creation_date.strftime("%b %Y")
				period_sort_map[row["period"]] = creation_date.strftime("%Y-%m")

	unique_periods = sorted(list(period_sort_map.keys()), key=lambda x: period_sort_map[x], reverse=True)
	
	for period in unique_periods:
		columns.append({
			"label": _(period),
			"fieldname": frappe.scrub(period),
			"fieldtype": "Float",
			"width": 120
		})
	
	columns.append({
		"label": _("Total"),
		"fieldname": "total_leads",
		"fieldtype": "Float",
		"width": 120
	})
	
	for row in data:
		row["total_leads"] = 0.0
		for period in unique_periods:
			fieldname = frappe.scrub(period)
			row[fieldname] = 0.0
			
		if row.get("period"):
			fieldname = frappe.scrub(row["period"])
			row[fieldname] = 1.0
			row["total_leads"] = 1.0

	chart = get_chart_data(data, filters)
	report_summary = get_report_summary(data)

	return columns, data, None, chart, report_summary


def get_report_summary(data):
	lead_types = ["Staffing", "ERP", "CRM", "CMS", "AI"]
	type_counts = {t: 0 for t in lead_types}
	
	for row in data:
		lead_type = row.get("type")
		if lead_type in type_counts:
			type_counts[lead_type] += 1
			
	summary = []
	for lead_type in lead_types:
		count = type_counts[lead_type]
		summary.append({
			"value": count,
			"indicator": "Blue" if count > 0 else "Grey",
			"label": _(lead_type),
			"datatype": "Int",
		})
		
	return summary


def get_chart_data(data, filters):
	lead_types = ["Staffing", "ERP", "CRM", "CMS", "AI"]
	type_counts = {t: 0 for t in lead_types}
	
	for row in data:
		lead_type = row.get("type")
		if lead_type in type_counts:
			type_counts[lead_type] += 1

	values = [type_counts[t] for t in lead_types]

	chart = {
		"data": {
			"labels": lead_types,
			"datasets": [
				{
					"name": _("Leads by Type"),
					"values": values
				}
			]
		},
		"type": "bar"
	}
	return chart


def get_columns():
	columns = [
		{
			"label": _("Lead"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Lead",
			"width": 150,
		},
		{"label": _("Lead Name"), "fieldname": "lead_name", "fieldtype": "Data", "width": 120},
		{"fieldname": "status", "label": _("Status"), "fieldtype": "Data", "width": 100},
		{
			"fieldname": "lead_owner",
			"label": _("Lead Owner"),
			"fieldtype": "Link",
			"options": "User",
			"width": 100,
		},
		{
			"fieldname": "type",
			"label": _("Lead Type"),
			"fieldtype": "Select",
			"options": "Staffing\nERP\nCRM\nCMS\nAI",
			"width": 100,
		},
		{
			"label": _("Territory"),
			"fieldname": "territory",
			"fieldtype": "Link",
			"options": "Territory",
			"width": 100,
		},
	]
	return columns


def get_data(filters):
	lead = frappe.qb.DocType("Lead")

	query = (
		frappe.qb.from_(lead)
		.select(
			lead.name,
			lead.lead_name,
			lead.status,
			lead.lead_owner,
			lead.type,
			lead.creation,
			lead.territory,
		)
	)

	if filters.get("territory"):
		query = query.where(lead.territory == filters.get("territory"))

	if filters.get("status"):
		query = query.where(lead.status == filters.get("status"))

	if filters.get("lead_owner"):
		query = query.where(lead.lead_owner == filters.get("lead_owner"))

	if filters.get("type"):
		query = query.where(lead.type == filters.get("type"))

	data = query.run(as_dict=1)
	
	import datetime
	from dateutil.relativedelta import relativedelta
	
	today = frappe.utils.getdate()
	
	if filters.get("period") == "Weekly":
		# Get start (Monday) and end (Sunday) of current week
		start_of_week = today - datetime.timedelta(days=today.weekday())
		end_of_week = start_of_week + datetime.timedelta(days=6)
		data = [d for d in data if d.get("creation") and start_of_week <= frappe.utils.getdate(d.get("creation")) <= end_of_week]
		
	elif filters.get("period") == "Monthly":
		# Current month
		start_of_month = today.replace(day=1)
		# Next month minus 1 day
		end_of_month = (start_of_month + relativedelta(months=1)) - datetime.timedelta(days=1)
		data = [d for d in data if d.get("creation") and start_of_month <= frappe.utils.getdate(d.get("creation")) <= end_of_month]
		
	elif filters.get("period") == "Quarterly":
		# Current quarter
		quarter = (today.month - 1) // 3 + 1
		start_of_quarter = today.replace(month=3 * quarter - 2, day=1)
		end_of_quarter = (start_of_quarter + relativedelta(months=3)) - datetime.timedelta(days=1)
		data = [d for d in data if d.get("creation") and start_of_quarter <= frappe.utils.getdate(d.get("creation")) <= end_of_quarter]
		
	elif filters.get("period") == "Yearly":
		# Current year
		start_of_year = today.replace(month=1, day=1)
		end_of_year = today.replace(month=12, day=31)
		data = [d for d in data if d.get("creation") and start_of_year <= frappe.utils.getdate(d.get("creation")) <= end_of_year]

	# Sort data so the most recent leads appear first
	data.sort(key=lambda x: str(x.get("creation") or ""), reverse=True)

	return data
