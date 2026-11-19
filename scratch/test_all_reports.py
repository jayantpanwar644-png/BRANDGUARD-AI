import sys
sys.path.insert(0, '.')
from pathlib import Path
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from backend.core.config import settings

class NumberedCanvas(canvas.Canvas):
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

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 20, "BrandGuard AI — Confidential Executive Intelligence Report")
        self.drawRightString(612 - 36, 20, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 30, 612 - 36, 30)
        self.restoreState()

def build_pie_chart(labels, data, colors_list):
    d = Drawing(460, 140)
    pie = Pie()
    pie.x = 160
    pie.y = 10
    pie.width = 120
    pie.height = 120
    pie.data = data
    pie.labels = labels
    pie.sideLabels = 1
    pie.slices.strokeWidth = 0.5
    for i, col in enumerate(colors_list):
        pie.slices[i].fillColor = col
    d.add(pie)
    return d

def build_bar_chart(categories, values, bar_color=colors.HexColor('#315C76')):
    d = Drawing(460, 130)
    chart = VerticalBarChart()
    chart.x = 40
    chart.y = 20
    chart.height = 90
    chart.width = 380
    chart.data = [values]
    chart.categoryAxis.categoryNames = categories
    chart.categoryAxis.labels.fontSize = 8
    chart.categoryAxis.labels.dy = -10
    chart.valueAxis.valueMin = 0
    max_val = max(values) if values else 100
    chart.valueAxis.valueMax = max(100, int(max_val * 1.2))
    chart.valueAxis.valueStep = 25
    chart.bars[0].fillColor = bar_color
    d.add(chart)
    return d

print("PDF helper classes loaded cleanly.")
