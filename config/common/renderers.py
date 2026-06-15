from rest_framework.renderers import JSONRenderer

class GlobalJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        
        # If response is already formatted by our custom response utility
        if isinstance(data, dict) and all(k in data for k in ['success', 'status_code', 'message']):
            if response:
                data['status_code'] = response.status_code
            return super().render(data, accepted_media_type, renderer_context)
            
        status_code = response.status_code if response else 200
        success = status_code < 400
        
        # Determine message based on response status
        if success:
            message = "Request completed successfully"
        else:
            message = "An error occurred"
            if isinstance(data, dict):
                message = data.get("detail") or data.get("message") or message
        
        formatted_data = {
            "success": success,
            "status_code": status_code,
            "message": message,
            "data": data if success else {},
            "errors": data if not success else None
        }
        
        return super().render(formatted_data, accepted_media_type, renderer_context)
