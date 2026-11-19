from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate
from backend.core.config import settings

d = Drawing(400, 160)
pie = Pie()
pie.x = 100
pie.y = 20
pie.width = 120
pie.height = 120
pie.data = [70, 20, 10]
pie.labels = ['Positive (70%)', 'Neutral (20%)', 'Negative (10%)']
pie.slices.strokeWidth = 0.5
pie.slices[0].fillColor = colors.HexColor('#10B981')
pie.slices[1].fillColor = colors.HexColor('#64748B')
pie.slices[2].fillColor = colors.HexColor('#EF4444')
d.add(pie)

test_pdf = settings.UPLOAD_DIR / "reports" / "test_chart.pdf"
doc = SimpleDocTemplate(str(test_pdf))
doc.build([d])
print(f"Generated test chart PDF at {test_pdf}, size: {test_pdf.stat().st_size} bytes")
