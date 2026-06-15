from rest_framework.response import Response

def success_response(data=None, message="Success", status_code=200):
    return Response({
        "success": True,
        "status_code": status_code,
        "message": message,
        "data": data if data is not None else {},
        "errors": None
    }, status=status_code)

def error_response(message="Error", errors=None, status_code=400):
    return Response({
        "success": False,
        "status_code": status_code,
        "message": message,
        "data": {},
        "errors": errors
    }, status=status_code)
