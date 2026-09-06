// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports["Weekly Lead Report"] = {
    filters: [
        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "Select",
            options: [
                { value: " ", label: __(" ") },
                { value: "Lead", label: __("Lead") },
                { value: "Open", label: __("Open") },
                { value: "Replied", label: __("Replied") },
                { value: "Opportunity", label: __("Opportunity") },
                { value: "Quotation", label: __("Quotation") },
                { value: "Lost Quotation", label: __("Lost Quotation") },
                { value: "Interested", label: __("Interested") },
                { value: "Converted", label: __("Converted") },
                { value: "Do Not Contact", label: __("Do Not Contact") },
            ],
        },
        {
            fieldname: "territory",
            label: __("Territory"),
            fieldtype: "Link",
            options: "Territory",
        },
        {
            fieldname: "period",
            label: __("Period"),
            fieldtype: "Select",
            options: [
                { value: "", label: __("") },
                { value: "Weekly", label: __("Weekly") },
                { value: "Monthly", label: __("Monthly") },
                { value: "Quarterly", label: __("Quarterly") },
                { value: "Yearly", label: __("Yearly") },
            ],
        },
        {
            fieldname: "type",
            label: __("Lead Type"),
            fieldtype: "Select",
            options: [
                { value: " ", label: __(" ") },
                { value: "Staffing", label: __("Staffing") },
                { value: "ERP", label: __("ERP") },
                { value: "CRM", label: __("CRM") },
                { value: "CMS", label: __("CMS") },
                { value: "AI", label: __("AI") },
                { value: "Custom Development", label: __("Custom Development") },
                { value: "Existing Client", label: __("Existing Client") },
                { value: "Consultant", label: __("Consultant") },
                { value: "Channel Partner", label: __("Channel Partner") },
            ],
        },
        {
            fieldname: "lead_owner",
            label: __("Lead Owner"),
            fieldtype: "Link",
            options: "User",
        },
        {
            fieldname: "campaign_name",
            label: __("Campaign Name"),
            fieldtype: "Link",
            options: "Campaign"
        },
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
            reqd: 0,
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
            reqd: 0,
        }
    ],
    get_chart_options: function (chart_data) {
        return {
            isNavigable: true // Enables click events on chart elements
        };
    },
    onload: function (report) {
        // Handle Chart Clicks
        $(report.page.wrapper).on("data-select", function (e, chart_data) {
            if (chart_data && chart_data.label) {
                let lead_type = chart_data.label; // e.g., "Staffing", "ERP", "CRM", etc.

                // Capitalization safety check for newly added multi-word types (Chart click)
                if (lead_type === "Custom development") {
                    lead_type = "Custom Development";
                } else if (lead_type === "Existing client") {
                    lead_type = "Existing Client";
                } else if (lead_type === "Channel partner") {
                    lead_type = "Channel Partner";
                }

                let period_filter = report.get_filter_value("period");

                let start_date, end_date;
                let today = frappe.datetime.nowdate();

                if (period_filter === "Weekly") {
                    start_date = moment(today).startOf('isoWeek').format('YYYY-MM-DD');
                    end_date = moment(today).endOf('isoWeek').format('YYYY-MM-DD');
                } else if (period_filter === "Quarterly") {
                    start_date = moment(today).startOf('quarter').format('YYYY-MM-DD');
                    end_date = moment(today).endOf('quarter').format('YYYY-MM-DD');
                } else if (period_filter === "Yearly") {
                    start_date = moment(today).startOf('year').format('YYYY-MM-DD');
                    end_date = moment(today).endOf('year').format('YYYY-MM-DD');
                } else if (period_filter === "Monthly") {
                    start_date = moment(today).startOf('month').format('YYYY-MM-DD');
                    end_date = moment(today).endOf('month').format('YYYY-MM-DD');
                }

                // Redirect to the Lead list view with the current date range and selected filters
                let route_options = {
                    "type": lead_type
                };

                if (start_date && end_date) {
                    route_options["creation"] = ["between", [start_date, end_date]];
                }

                let status = report.get_filter_value("status");
                if (status) route_options["status"] = status;

                let territory = report.get_filter_value("territory");
                if (territory) route_options["territory"] = territory;

                let lead_owner = report.get_filter_value("lead_owner");
                if (lead_owner) route_options["lead_owner"] = lead_owner;

                let campaign_name = report.get_filter_value("campaign_name");
                if (campaign_name) route_options["campaign_name"] = campaign_name;

                frappe.set_route("List", "Lead", route_options);
            }
        });

        // Set up listener for native CustomEvent as Frappe Charts sometimes fires it this way
        report.page.wrapper.get(0).addEventListener('data-select', function (e) {
            if (e.detail && e.detail.label) {
                $(report.page.wrapper).trigger('data-select', e.detail);
            }
        });

        // Inject custom CSS to make the number cards match the exact layout & colors requested
        $(`<style>
            .report-summary {
                display: flex;
                flex-wrap: wrap;
                gap: 15px; /* Spacing between the items */
                padding: 15px 0 !important;
                justify-content: flex-start !important;
            }

            /* Outer white card container */
            .summary-item {
                background-color: #ffffff !important;
                border: 1px solid #eaeaea !important;
                border-radius: 8px !important;
                padding: 12px 14px 14px 14px !important;
                min-width: 220px !important;
                display: flex !important;
                flex-direction: column;
                box-shadow: none !important;
                margin: 0 !important;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                cursor: pointer;
                box-sizing: border-box;
                height: auto !important;
            }
            .summary-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06) !important;
            }

            /* Header row of the card (Label + Ellipsis) */
            .summary-item .summary-label {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #7b8084 !important;
                text-transform: uppercase;
                text-align: left !important;
                margin-bottom: 12px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                letter-spacing: 0.5px;
                width: 100%;
            }

            .summary-item .summary-label .indicator {
                display: none !important; /* Hide original indicator dot */
            }

            /* Add the '...' ellipsis using CSS pseudo-element to match image */
            .summary-item .summary-label::after {
                content: '...';
                font-size: 18px;
                color: #a4abb3;
                letter-spacing: 1px;
                line-height: 0.5;
                margin-top: -8px;
            }

            /* Inner colored box for Value */
            .summary-item .summary-value {
                border-radius: 6px !important;
                padding: 18px 10px !important;
                text-align: center;
                font-size: 24px !important;
                font-weight: 600 !important;
                color: #2e343a !important;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin: 0 !important;
            }

            /* Colors for the cards based on the mockup */
            
            /* 1: Light Blue */
            .summary-item:nth-child(1) .summary-value { background-color: #AADAEC !important; }
            
            /* 2: Light Cyan */
            .summary-item:nth-child(2) .summary-value { background-color: #DFFFFC !important; }
            
            /* 3: Light Green */
            .summary-item:nth-child(3) .summary-value { background-color: #9BF29B !important; }
            
            /* 4: Light Orange */
            .summary-item:nth-child(4) .summary-value { background-color: #FFA585 !important; }
            
            /* 5: Light Purple (for AI lead type) */
            .summary-item:nth-child(5) .summary-value { background-color: #E2D9F3 !important; }

            /* 6: Light Yellow */
            .summary-item:nth-child(6) .summary-value { background-color: #FFF2CC !important; }

            /* 7: Light Pink */
            .summary-item:nth-child(7) .summary-value { background-color: #F8CBAD !important; }

            /* 8: Light Indigo */
            .summary-item:nth-child(8) .summary-value { background-color: #DDEBF7 !important; }

            /* 9: Light Teal */
            .summary-item:nth-child(9) .summary-value { background-color: #E2EFDA !important; }
            
            /* 10: Total Leads (Darker professional blue/grey) */
            .summary-item:nth-child(10) .summary-value { background-color: #E2E8F0 !important; }

        </style>`).appendTo("head");

        // Handle Number Card Clicks
        // Use event delegation on the wrapper since the cards are built dynamically after onload
        $(report.page.wrapper).on("click", ".summary-item", function () {
            // Re-use logic to grab period and calculate boundaries just like the chart handler
            let lead_type = $(this).find('.summary-label').text().trim() || $(this).attr('title');

            // In case the label is heavily upper-cased by css we should fix capitalized version:
            lead_type = lead_type.charAt(0).toUpperCase() + lead_type.slice(1).toLowerCase();
            // Edge case for capitalized identifiers e.g. "ERP" / "CRM" / "CMS" / "AI"
            if (["Erp", "Crm", "Cms", "Ai"].includes(lead_type)) {
                lead_type = lead_type.toUpperCase();
            } else if (lead_type === "Custom development") {
                lead_type = "Custom Development";
            } else if (lead_type === "Existing client") {
                lead_type = "Existing Client";
            } else if (lead_type === "Channel partner") {
                lead_type = "Channel Partner";
            }

            let period_filter = report.get_filter_value("period");

            let start_date, end_date;
            let today = frappe.datetime.nowdate();

            if (period_filter === "Weekly") {
                start_date = moment(today).startOf('isoWeek').format('YYYY-MM-DD');
                end_date = moment(today).endOf('isoWeek').format('YYYY-MM-DD');
            } else if (period_filter === "Quarterly") {
                start_date = moment(today).startOf('quarter').format('YYYY-MM-DD');
                end_date = moment(today).endOf('quarter').format('YYYY-MM-DD');
            } else if (period_filter === "Yearly") {
                start_date = moment(today).startOf('year').format('YYYY-MM-DD');
                end_date = moment(today).endOf('year').format('YYYY-MM-DD');
            } else if (period_filter === "Monthly") {
                start_date = moment(today).startOf('month').format('YYYY-MM-DD');
                end_date = moment(today).endOf('month').format('YYYY-MM-DD');
            }

            // Redirect to the Lead list view with the current date range and selected filters
            let route_options = {};

            // Only explicitly filter by type if they didn't click the "Total Leads" card
            if (lead_type !== "Total Leads") {
                route_options["type"] = lead_type;
            }

            if (start_date && end_date) {
                route_options["creation"] = ["between", [start_date, end_date]];
            }

            let status = report.get_filter_value("status");
            if (status) route_options["status"] = status;

            let territory = report.get_filter_value("territory");
            if (territory) route_options["territory"] = territory;

            let lead_owner = report.get_filter_value("lead_owner");
            if (lead_owner) route_options["lead_owner"] = lead_owner;

            let campaign_name = report.get_filter_value("campaign_name");
            if (campaign_name) route_options["campaign_name"] = campaign_name

            frappe.set_route("List", "Lead", route_options);
        });
    }
};
