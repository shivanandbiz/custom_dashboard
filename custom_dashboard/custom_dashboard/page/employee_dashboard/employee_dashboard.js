frappe.pages['employee-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Employee Dashboard',
        single_column: true
    });

    // Initialize dashboard
    new EmployeeDashboard(page);
};

class EmployeeDashboard {
    constructor(page) {
        this.page = page;
        this.wrapper = $(this.page.body);
        this.employee = null;
        this.isCheckedIn = false;
        this.clockInterval = null;
        this.statusInterval = null;
        
        this.init();
    }

    init() {
        // Load HTML template
        this.wrapper.html(frappe.render_template('employee_dashboard'));
        
        // Cache DOM elements
        this.cacheElements();
        
        // Bind events
        this.bindEvents();
        
        // Start clock
        this.startClock();
        
        // Load data
        this.loadEmployeeData();
        this.loadTodayStatus();
        
        // Auto refresh status every 30 seconds
        this.statusInterval = setInterval(() => {
            this.loadTodayStatus();
        }, 30000);
        
        // Update date/time
        this.updateDateTime();
    }

    cacheElements() {
        this.$signInBtn = this.wrapper.find('#btnSignIn');
        this.$signOutBtn = this.wrapper.find('#btnSignOut');
        this.$digitalClock = this.wrapper.find('#digitalClock');
        this.$currentDate = this.wrapper.find('#currentDate');
        this.$dayTime = this.wrapper.find('#dayTime');
        this.$statusIndicator = this.wrapper.find('#statusIndicator .status-dot');
        this.$employeeName = this.wrapper.find('#employeeName');
        this.$employeeDept = this.wrapper.find('#employeeDept');
        this.$hoursToday = this.wrapper.find('#hoursToday');
        this.$checkinCount = this.wrapper.find('#checkinCount');
        this.$activityList = this.wrapper.find('#activityList');
        this.$loadingOverlay = this.wrapper.find('#loadingOverlay');
        this.$viewSwipesBtn = this.wrapper.find('#btnViewSwipes');
    }

    bindEvents() {
        // Sign In button
        this.$signInBtn.on('click', () => {
            this.handleSignIn();
        });

        // Sign Out button
        this.$signOutBtn.on('click', () => {
            this.handleSignOut();
        });

        // View Swipes button
        this.$viewSwipesBtn.on('click', () => {
            this.viewAllSwipes();
        });
    }

    startClock() {
        // Update clock immediately
        this.updateClock();
        
        // Update every second
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);
    }

    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        this.$digitalClock.text(`${hours} : ${minutes} : ${seconds}`);
    }

    updateDateTime() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        
        const dayOptions = { weekday: 'long' };
        const dayStr = now.toLocaleDateString('en-US', dayOptions);
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        this.$currentDate.text(dateStr);
        this.$dayTime.text(`${dayStr} | ${timeStr}`);
    }

    showLoading(show = true) {
        if (show) {
            this.$loadingOverlay.fadeIn(200);
        } else {
            this.$loadingOverlay.fadeOut(200);
        }
    }

    async loadEmployeeData() {
        try {
            const response = await frappe.call({
                method: 'custom_dashboard.api.attendance.get_employee_details',
                freeze: false
            });

            if (response.message && response.message.success) {
                this.employee = response.message.employee;
                this.$employeeName.text(this.employee.employee_name || '-');
                this.$employeeDept.text(this.employee.department || '-');
            } else {
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: response.message?.message || __('Failed to load employee data')
                });
            }
        } catch (error) {
            console.error('Error loading employee data:', error);
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: __('Failed to load employee data')
            });
        }
    }

    async loadTodayStatus() {
        try {
            const response = await frappe.call({
                method: 'custom_dashboard.api.attendance.get_today_status',
                freeze: false
            });

            if (response.message && response.message.success) {
                const status = response.message;
                this.isCheckedIn = status.is_checked_in;
                
                // Update UI based on status
                this.updateButtonVisibility();
                this.updateStatusIndicator();
                
                // Update stats
                this.$hoursToday.text(status.total_hours || '0.0');
                this.$checkinCount.text(status.total_logs || '0');
                
                // Load activity
                this.loadActivity();
            }
        } catch (error) {
            console.error('Error loading today status:', error);
        }
    }

    updateButtonVisibility() {
        if (this.isCheckedIn) {
            this.$signInBtn.hide();
            this.$signOutBtn.show();
        } else {
            this.$signInBtn.show();
            this.$signOutBtn.hide();
        }
    }

    updateStatusIndicator() {
        if (this.isCheckedIn) {
            this.$statusIndicator.addClass('active');
        } else {
            this.$statusIndicator.removeClass('active');
        }
    }

    async handleSignIn() {
        // Confirm action
        frappe.confirm(
            __('Are you sure you want to check in?'),
            async () => {
                this.showLoading(true);
                this.$signInBtn.prop('disabled', true);
                
                try {
                    const response = await frappe.call({
                        method: 'custom_dashboard.api.attendance.check_in',
                        freeze: false
                    });

                    this.showLoading(false);
                    this.$signInBtn.prop('disabled', false);

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Checked in successfully!'),
                            indicator: 'green'
                        }, 5);
                        
                        // Reload status
                        await this.loadTodayStatus();
                    } else {
                        frappe.msgprint({
                            title: __('Error'),
                            indicator: 'red',
                            message: response.message?.message || __('Failed to check in')
                        });
                    }
                } catch (error) {
                    this.showLoading(false);
                    this.$signInBtn.prop('disabled', false);
                    console.error('Error during check in:', error);
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('Failed to check in. Please try again.')
                    });
                }
            }
        );
    }

    async handleSignOut() {
        // Confirm action
        frappe.confirm(
            __('Are you sure you want to check out?'),
            async () => {
                this.showLoading(true);
                this.$signOutBtn.prop('disabled', true);
                
                try {
                    const response = await frappe.call({
                        method: 'custom_dashboard.api.attendance.check_out',
                        freeze: false
                    });

                    this.showLoading(false);
                    this.$signOutBtn.prop('disabled', false);

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Checked out successfully!'),
                            indicator: 'orange'
                        }, 5);
                        
                        // Reload status
                        await this.loadTodayStatus();
                    } else {
                        frappe.msgprint({
                            title: __('Error'),
                            indicator: 'red',
                            message: response.message?.message || __('Failed to check out')
                        });
                    }
                } catch (error) {
                    this.showLoading(false);
                    this.$signOutBtn.prop('disabled', false);
                    console.error('Error during check out:', error);
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('Failed to check out. Please try again.')
                    });
                }
            }
        );
    }

    async loadActivity() {
        try {
            const response = await frappe.call({
                method: 'custom_dashboard.api.attendance.get_attendance_history',
                args: {
                    limit: 10
                },
                freeze: false
            });

            if (response.message && response.message.success) {
                const logs = response.message.logs;
                this.renderActivity(logs);
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    renderActivity(logs) {
        if (!logs || logs.length === 0) {
            this.$activityList.html(`
                <div class="activity-empty">
                    <p>No activity today</p>
                </div>
            `);
            return;
        }

        let html = '';
        logs.forEach(log => {
            const time = moment(log.time).format('hh:mm A');
            const date = moment(log.time).format('MMM DD, YYYY');
            const badgeClass = log.log_type === 'IN' ? 'badge-in' : 'badge-out';
            const logType = log.log_type === 'IN' ? 'Check In' : 'Check Out';

            html += `
                <div class="activity-item">
                    <div class="activity-type">
                        <span class="activity-badge ${badgeClass}">${logType}</span>
                        <span class="activity-date">${date}</span>
                    </div>
                    <span class="activity-time">${time}</span>
                </div>
            `;
        });

        this.$activityList.html(html);
    }

    viewAllSwipes() {
        if (!this.employee) {
            frappe.msgprint(__('Employee data not loaded'));
            return;
        }

        // Navigate to Employee Checkin list with filters
        frappe.set_route('List', 'Employee Checkin', {
            employee: this.employee.name
        });
    }

    destroy() {
        // Clear intervals
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
}