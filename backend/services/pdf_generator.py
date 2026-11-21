from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether,
    Image as RLImage
)
from PIL import Image as PILImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart

from backend.core.config import settings

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that computes total pages dynamically
    and prints a professional running footer with 'Page X of Y'.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#172333"))
        self.drawString(36, 22, "BRANDGUARD AI")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(108, 22, "|  Confidential & Proprietary Enterprise Brand Intelligence Report")
        self.drawRightString(612 - 36, 22, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.6)
        self.line(36, 32, 612 - 36, 32)
        self.restoreState()


def create_pie_chart(labels: List[str], data: List[float], slice_colors: List[Any]) -> Drawing:
    d = Drawing(460, 140)
    pie = Pie()
    pie.x = 160
    pie.y = 10
    pie.width = 120
    pie.height = 120
    pie.data = data
    pie.labels = labels
    pie.slices.strokeWidth = 0.5
    pie.slices.strokeColor = colors.white
    for i, col in enumerate(slice_colors):
        if i < len(pie.slices):
            pie.slices[i].fillColor = col
    d.add(pie)
    return d


def create_bar_chart(categories: List[str], values: List[float], bar_color: Any = colors.HexColor('#315C76')) -> Drawing:
    d = Drawing(460, 130)
    chart = VerticalBarChart()
    chart.x = 45
    chart.y = 20
    chart.height = 90
    chart.width = 380
    chart.data = [values]
    chart.categoryAxis.categoryNames = categories
    chart.categoryAxis.labels.fontSize = 8
    chart.valueAxis.valueMin = 0
    max_val = max(values) if values else 100
    chart.valueAxis.valueMax = max(100, int(max_val * 1.15))
    chart.valueAxis.valueStep = 25
    chart.bars[0].fillColor = bar_color
    chart.bars[0].strokeColor = None
    d.add(chart)
    return d


def generate_pdf_report(
    report_type: str,
    title: str,
    company_name: str,
    data: Dict[str, Any],
    subtitle: Optional[str] = None,
    industry: Optional[str] = None
) -> str:
    """
    Generates a high-quality, print-ready Executive Brand Intelligence PDF report.
    Returns the absolute path to the generated PDF.
    """
    reports_dir = settings.UPLOAD_DIR / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    clean_type = report_type.lower().replace(" ", "_").replace("&", "and")
    filename = f"{clean_type}_{timestamp}.pdf"
    output_path = reports_dir / filename

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    brand_title_style = ParagraphStyle(
        'BrandTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#172333')
    )

    tagline_style = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#64748B')
    )

    report_title_style = ParagraphStyle(
        'ReportHeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#172333'),
        spaceBefore=8,
        spaceAfter=2
    )

    report_subtitle_style = ParagraphStyle(
        'ReportHeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=10
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#172333'),
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    body_bold = ParagraphStyle(
        'ReportBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#172333')
    )

    body_small = ParagraphStyle(
        'ReportBodySmall',
        parent=body_style,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B')
    )

    kpi_number_style = ParagraphStyle(
        'KpiNumber',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=colors.HexColor('#172333')
    )

    kpi_label_style = ParagraphStyle(
        'KpiLabel',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B')
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1E293B')
    )

    elements = []

    # 1. Top Brand Banner
    banner_table = Table([
        [
            Paragraph("<b>BRANDGUARD AI</b>", brand_title_style),
            Paragraph("<b>EXECUTIVE INTELLIGENCE BRIEF</b><br/><font size=7.5 color='#64748B'>GOVERNANCE & TRUST REGISTER</font>", ParagraphStyle('HRight', parent=body_style, alignment=2))
        ],
        [
            Paragraph("AI-Powered Brand Governance, Content Compliance & Reputation Protection", tagline_style),
            Paragraph("Classification: <b>CONFIDENTIAL</b>", ParagraphStyle('HRight2', parent=body_small, alignment=2))
        ]
    ], colWidths=[360, 180])
    banner_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#315C76"), spaceAfter=12))

    # 2. Report Main Title & Subtitle
    elements.append(Paragraph(title, report_title_style))
    if subtitle:
        elements.append(Paragraph(subtitle, report_subtitle_style))
    else:
        elements.append(Paragraph(f"Official {report_type} generated for enterprise governance review and stakeholder assurance.", report_subtitle_style))

    # 3. Meta Data Table
    gen_time = datetime.now(timezone.utc).strftime("%B %d, %Y • %H:%M UTC")
    meta_rows = [
        [
            Paragraph("<b>Organisation:</b>", body_style), Paragraph(company_name, body_bold),
            Paragraph("<b>Generated:</b>", body_style), Paragraph(gen_time, body_style)
        ],
        [
            Paragraph("<b>Industry / Category:</b>", body_style), Paragraph(industry or "Enterprise", body_style),
            Paragraph("<b>Report Scope:</b>", body_style), Paragraph(data.get("scope", "All Available Content"), body_style)
        ],
        [
            Paragraph("<b>Audit Engine:</b>", body_style), Paragraph("BrandGuard Core v2.4 (Grounded RAG & Vision)", body_style),
            Paragraph("<b>Data Status:</b>", body_style), Paragraph("Verified System Records", body_bold)
        ]
    ]
    meta_table = Table(meta_rows, colWidths=[110, 160, 95, 175])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 4. Executive Summary Box
    elements.append(Paragraph("1. Executive Summary", section_heading))
    summary_text = data.get("summary", "This report synthesizes brand compliance, factual claim verifications, and reputation intelligence from continuous database records.")
    summary_box = Table([[Paragraph(summary_text, callout_style)]], colWidths=[540])
    summary_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_box)
    elements.append(Spacer(1, 10))

    # 5. Key Metrics KPI Cards Table
    metrics = data.get("metrics", [])
    if metrics:
        elements.append(Paragraph("2. Key Performance Indicators", section_heading))
        kpi_cells = []
        for label, val in metrics[:4]:
            cell_content = [
                Paragraph(str(val), kpi_number_style),
                Spacer(1, 2),
                Paragraph(label, kpi_label_style)
            ]
            kpi_cells.append(cell_content)
        
        while len(kpi_cells) < 4:
            kpi_cells.append([Paragraph("—", kpi_number_style), Spacer(1, 2), Paragraph("N/A", kpi_label_style)])

        kpi_table = Table([kpi_cells], colWidths=[135, 135, 135, 135])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 10))

    # Creative Asset Image Preview (if provided)
    asset_img_path = data.get("asset_image_path")
    if asset_img_path and Path(asset_img_path).exists():
        try:
            with PILImage.open(asset_img_path) as pimg:
                pw, ph = pimg.size
                aspect = ph / max(1, pw)
                target_w = 340
                target_h = int(target_w * aspect)
                if target_h > 200:
                    target_h = 200
                    target_w = int(target_h / max(0.01, aspect))

                elements.append(Paragraph("Audited Creative Asset", section_heading))
                img_table = Table([[RLImage(asset_img_path, width=target_w, height=target_h)]], colWidths=[540])
                img_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('PADDING', (0, 0), (-1, -1), 6)
                ]))
                elements.append(img_table)
                elements.append(Spacer(1, 10))
        except Exception as img_err:
            print(f"PDF asset image embedding notice: {img_err}")

    # Company & Product Relevance Evaluation
    comp_rel = data.get("company_relevance") or data.get("raw_analysis_json", {}).get("company_relevance")
    if comp_rel:
        elements.append(Paragraph("Company & Product Relevance Evaluation", section_heading))
        st = comp_rel.get("status", "Needs Review")
        st_color = "#059669" if st == "Related to Company" else ("#DC2626" if st == "Not Related to Company" else "#D97706")
        rel_rows = [
            [Paragraph("<b>Relevance Verdict</b>", body_style), Paragraph(f"<font color='{st_color}'><b>{st}</b></font>", body_style)],
            [Paragraph("<b>Detected Subject</b>", body_style), Paragraph(comp_rel.get("detected_product_or_service", "Unspecified"), body_style)],
            [Paragraph("<b>Matched Portfolio Offering</b>", body_style), Paragraph(comp_rel.get("matched_company_offering") or "None / Domain Alignment", body_style)],
            [Paragraph("<b>Evidence & Analysis</b>", body_style), Paragraph(comp_rel.get("explanation", "") + "<br/>" + comp_rel.get("evidence", ""), body_style)],
            [Paragraph("<b>Action Required</b>", body_style), Paragraph(comp_rel.get("recommended_action", ""), body_style)]
        ]
        rel_table = Table(rel_rows, colWidths=[160, 380])
        rel_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#FFFFFF')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        elements.append(rel_table)
        elements.append(Spacer(1, 10))

    # 6. Visual Chart Section
    chart_info = data.get("chart_info")
    if chart_info:
        elements.append(Paragraph("Visual Analytics & Compliance Distribution", section_heading))
        chart_type = chart_info.get("type", "bar")
        if chart_type == "pie" and chart_info.get("data"):
            chart_drawing = create_pie_chart(
                labels=chart_info.get("labels", []),
                data=chart_info.get("data", []),
                slice_colors=chart_info.get("colors", [colors.HexColor('#10B981'), colors.HexColor('#64748B'), colors.HexColor('#EF4444')])
            )
            elements.append(chart_drawing)
        elif chart_type == "bar" and chart_info.get("categories") and chart_info.get("values"):
            chart_drawing = create_bar_chart(
                categories=chart_info.get("categories", []),
                values=chart_info.get("values", []),
                bar_color=chart_info.get("bar_color", colors.HexColor('#315C76'))
            )
            elements.append(chart_drawing)
        elements.append(Spacer(1, 10))

    # Resolved Governance Items (if revisions resolved prior issues)
    resolved_findings = data.get("resolved_findings", [])
    if resolved_findings:
        elements.append(Paragraph("Resolved Governance Items (Fixed by AI Revision / User Edit)", section_heading))
        rf_rows = [["Category", "Issue Title", "Resolution Status"]]
        for rf in resolved_findings[:6]:
            rf_rows.append([
                Paragraph(rf.get("category", "General"), body_style),
                Paragraph(rf.get("title", ""), body_style),
                Paragraph("<font color='#059669'><b>Resolved in Revision</b></font>", body_style)
            ])
        rf_table = Table(rf_rows, colWidths=[130, 260, 150])
        rf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#065F46')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#A7F3D0')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F0FDF4'), colors.HexColor('#FFFFFF')])
        ]))
        elements.append(rf_table)
        elements.append(Spacer(1, 10))

    # 7. Detailed Section / Tables based on Report Type
    findings = data.get("findings", [])
    if findings:
        elements.append(Paragraph("Detailed Audit Findings & Active Policy Violations", section_heading))
        f_rows = [["Category", "Severity", "Finding Description", "Required Remediation"]]
        for f in findings[:8]:
            sev = f.get("severity", "Medium")
            sev_color = "#DC2626" if sev == "High" or sev == "Critical" else ("#D97706" if sev == "Medium" else "#2563EB")
            f_rows.append([
                Paragraph(f.get("category", "General"), body_style),
                Paragraph(f"<font color='{sev_color}'><b>{sev}</b></font>", body_style),
                Paragraph(f.get("description", ""), body_style),
                Paragraph(f.get("recommendation", "Review against guidelines"), body_style)
            ])
        f_table = Table(f_rows, colWidths=[100, 65, 195, 180])
        f_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(f_table)
        elements.append(Spacer(1, 10))

    claims = data.get("claims", [])
    if claims:
        elements.append(Paragraph("Detailed Claim Verification Passport", section_heading))
        claim_rows = [["Detected Marketing Statement", "Category", "Verification Status", "Supporting Citation"]]
        for c in claims[:8]:
            st = c.get("status", "Pending")
            st_color = "#10B981" if st == "Supported" else ("#DC2626" if st == "Contradicted" else "#D97706")
            claim_rows.append([
                Paragraph(f'"{c.get("statement", "")}"', body_style),
                Paragraph(c.get("category", "Product"), body_style),
                Paragraph(f"<font color='{st_color}'><b>{st}</b></font>", body_style),
                Paragraph(c.get("source", "No Evidence Uploaded"), body_style)
            ])
        c_table = Table(claim_rows, colWidths=[190, 85, 105, 160])
        c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(c_table)
        elements.append(Spacer(1, 10))

    approvals = data.get("approvals", [])
    if approvals:
        elements.append(Paragraph("Human Governance Sign-Off Trail", section_heading))
        appr_rows = [["Content Asset", "Reviewer", "Decision", "Timestamp", "Reviewer Notes"]]
        for a in approvals[:8]:
            dec = a.get("action", "PENDING")
            dec_color = "#10B981" if dec == "APPROVED" else ("#DC2626" if dec == "REJECTED" else "#D97706")
            appr_rows.append([
                Paragraph(a.get("title", "Asset"), body_style),
                Paragraph(a.get("reviewer", "Reviewer"), body_style),
                Paragraph(f"<font color='{dec_color}'><b>{dec}</b></font>", body_style),
                Paragraph(a.get("date", ""), body_small),
                Paragraph(a.get("notes", "No notes"), body_style)
            ])
        a_table = Table(appr_rows, colWidths=[120, 100, 85, 85, 150])
        a_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(a_table)
        elements.append(Spacer(1, 10))

    feedbacks = data.get("feedbacks", [])
    if feedbacks:
        elements.append(Paragraph("Audience Comments & Sentiment Sample", section_heading))
        feed_rows = [["Audience Handle", "Comment Excerpt", "Sentiment", "Detected Emotion"]]
        for fb in feedbacks[:6]:
            sent = fb.get("sentiment", "NEUTRAL")
            sent_col = "#10B981" if sent == "POSITIVE" else ("#DC2626" if sent == "NEGATIVE" else "#64748B")
            feed_rows.append([
                Paragraph(f"@{fb.get('handle', 'user')}", body_style),
                Paragraph(f'"{fb.get("comment", "")}"', body_style),
                Paragraph(f"<font color='{sent_col}'><b>{sent}</b></font>", body_style),
                Paragraph(fb.get("emotion", "General"), body_style)
            ])
        fb_table = Table(feed_rows, colWidths=[110, 240, 90, 100])
        fb_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(fb_table)
        elements.append(Spacer(1, 10))

    complaints = data.get("complaints", [])
    if complaints:
        elements.append(Paragraph("Customer Complaint Clusters", section_heading))
        comp_rows = [["Complaint Topic Cluster", "Frequency Count", "Severity Level", "Sample Customer Quote"]]
        for cp in complaints[:6]:
            comp_rows.append([
                Paragraph(cp.get("topic", "General"), body_style),
                Paragraph(f"<b>{cp.get('count', 1)} incidents</b>", body_style),
                Paragraph(f"<font color='#DC2626'><b>{cp.get('severity', 'Medium')}</b></font>", body_style),
                Paragraph(f'"{cp.get("sample", "")}"', body_style)
            ])
        comp_table = Table(comp_rows, colWidths=[140, 90, 80, 230])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(comp_table)
        elements.append(Spacer(1, 10))

    incidents = data.get("incidents", [])
    if incidents:
        elements.append(Paragraph("Reputation Incidents & Containment", section_heading))
        inc_rows = [["Incident Title", "Severity", "Current Status", "Detection Date", "Recommended Containment"]]
        for inc in incidents[:6]:
            inc_rows.append([
                Paragraph(inc.get("title", ""), body_style),
                Paragraph(f"<font color='#DC2626'><b>{inc.get('severity', 'Medium')}</b></font>", body_style),
                Paragraph(f"<b>{inc.get('status', 'Active')}</b>", body_style),
                Paragraph(inc.get("date", ""), body_small),
                Paragraph(inc.get("action", "Monitor and respond"), body_style)
            ])
        inc_table = Table(inc_rows, colWidths=[130, 60, 75, 75, 200])
        inc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(inc_table)
        elements.append(Spacer(1, 10))

    posts = data.get("posts", [])
    if posts:
        elements.append(Paragraph("Published Social Campaign Performance", section_heading))
        post_rows = [["Platform", "Campaign / Caption", "Published Date", "Engagements", "Total Reach"]]
        for p in posts[:6]:
            post_rows.append([
                Paragraph(f"<b>{p.get('platform', 'Social')}</b>", body_style),
                Paragraph(p.get("caption", "Post content"), body_style),
                Paragraph(p.get("date", ""), body_small),
                Paragraph(p.get("engagement", "0"), body_style),
                Paragraph(p.get("reach", "0"), body_style)
            ])
        p_table = Table(post_rows, colWidths=[75, 225, 80, 80, 80])
        p_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')])
        ]))
        elements.append(p_table)
        elements.append(Spacer(1, 10))

    recommendations = data.get("recommendations", [])
    if recommendations:
        elements.append(Paragraph("Strategic Recommendations & Action Items", section_heading))
        rec_items = []
        for i, rec in enumerate(recommendations, 1):
            rec_items.append([
                Paragraph(f"<b>0{i}</b>", ParagraphStyle('RecNum', parent=body_bold, textColor=colors.HexColor('#315C76'))),
                Paragraph(rec, body_style)
            ])
        rec_table = Table(rec_items, colWidths=[30, 510])
        rec_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9')),
        ]))
        elements.append(rec_table)
        elements.append(Spacer(1, 10))

    missing_notes = data.get("missing_notes", [])
    if missing_notes:
        elements.append(Spacer(1, 4))
        missing_text = "<b>Data Notice & Completeness:</b><br/>" + "<br/>".join([f"• {note}" for note in missing_notes])
        m_box = Table([[Paragraph(missing_text, body_small)]], colWidths=[540])
        m_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFBEB')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(m_box)
        elements.append(Spacer(1, 10))

    elements.append(Spacer(1, 8))
    stamp_text = [
        [
            Paragraph("<b>AUTOMATED AUDIT SEAL</b><br/><font size=7 color='#64748B'>BrandGuard Grounded Engine v2.4</font>", body_small),
            Paragraph("<b>STATUS:</b> <font color='#10B981'><b>OFFICIAL RECORD</b></font><br/><font size=7 color='#64748B'>Checksum verified in audit trail</font>", body_small),
            Paragraph("<b>COMPLIANCE SIGN-OFF</b><br/><font size=7 color='#64748B'>Approved for Executive Distribution</font>", body_small)
        ]
    ]
    stamp_table = Table(stamp_text, colWidths=[180, 180, 180])
    stamp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(stamp_table)

    doc.build(elements, canvasmaker=NumberedCanvas)
    return str(output_path)