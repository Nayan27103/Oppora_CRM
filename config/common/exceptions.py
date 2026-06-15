from rest_framework.views import exception_handler
from rest_framework.response import Response

def global_exception_handler(exc, context):
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)
    
    if response is not None:
        status_code = response.status_code
        detail = response.data.get('detail') if isinstance(response.data, dict) else str(exc)
        
        errors = response.data
        if isinstance(errors, dict) and 'detail' in errors:
            errors = errors['detail']
            
        response.data = {
            "success": False,
            "status_code": status_code,
            "message": str(detail) if detail else "Validation failed",
            "data": {},
            "errors": errors
        }
    else:
        # Unhandled exceptions (500 Internal Server Error)
        response = Response({
            "success": False,
            "status_code": 500,
            "message": "Internal Server Error",
            "data": {},
            "errors": str(exc)
        }, status=500)
        
    return response
