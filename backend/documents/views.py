from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Document
from .serializers import DocumentSerializer

from core.services.ai_service import analyze_document

import pdfplumber


class UploadDocumentView(APIView):

    def post(self, request):

        uploaded_file = request.FILES.get("file")

        if not uploaded_file:

            return Response(
                {"error": "No file uploaded"},
                status=status.HTTP_400_BAD_REQUEST
            )

        extracted_text = ""

        try:

            with pdfplumber.open(uploaded_file) as pdf:

                total_pages = len(pdf.pages)

                for page in pdf.pages:

                    text = page.extract_text()

                    if text:
                        extracted_text += text + "\n"

            # AI ANALYSIS
            ai_analysis = analyze_document(extracted_text)

            # SAVE DOCUMENT
            document = Document.objects.create(
                file=uploaded_file,
                extracted_text=extracted_text
            )

            serializer = DocumentSerializer(document)

            return Response({

                "message": "File processed successfully",

                "document": serializer.data,

                "metadata": {
                    "file_name": uploaded_file.name,
                    "file_size": uploaded_file.size,
                    "pages": total_pages,
                    "doc_type": "PDF"
                },

                "extracted_text": extracted_text[:3000],

                "ai_analysis": ai_analysis

            })

        except Exception as e:

            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )