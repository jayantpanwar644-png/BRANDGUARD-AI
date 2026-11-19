from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
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

doc = SimpleDocTemplate(
    str(settings.UPLOAD_DIR / "reports" / "test_numbered.pdf"),
    pagesize=letter,
    leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=40
)
styles = getSampleStyleSheet()
story = [Paragraph("Hello World", styles['Heading1']), Spacer(1, 20), Paragraph("Second page test", styles['Normal'])]
doc.build(story, canvasmaker=NumberedCanvas)
print("NumberedCanvas test passed!")
