import sys
sys.path.insert(0, '.')
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate
from backend.core.config import settings

d = Drawing(460, 140)
chart = VerticalBarChart()
chart.x = 40
chart.y = 25
chart.height = 95
chart.width = 380
chart.data = [[88, 92, 85, 90]]
chart.categoryAxis.categoryNames = ['Clarity', 'Consistency', 'Readability', 'Compliance']
chart.categoryAxis.labels.fontSize = 8
chart.valueAxis.valueMin = 0
chart.valueAxis.valueMax = 100
chart.valueAxis.valueStep = 25
chart.bars[0].fillColor = colors.HexColor('#315C76')
d.add(chart)

doc = SimpleDocTemplate(str(settings.UPLOAD_DIR / "reports" / "test_barchart.pdf"))
doc.build([d])
print(f"Bar chart generated, size: {(settings.UPLOAD_DIR / 'reports' / 'test_barchart.pdf').stat().st_size} bytes")
