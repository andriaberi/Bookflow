from django.http import JsonResponse


def error(code: str, detail: str, status: int = 400) -> JsonResponse:
    """An error the frontend shows in the page's language: it translates `code`."""
    return JsonResponse({"error": code, "detail": detail}, status=status)
