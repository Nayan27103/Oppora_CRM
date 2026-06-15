from rest_framework.renderers import JSONRenderer

class GlobalJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        
        status_code = response.status_code if response else 200
        success = status_code < 400
        
        # If the response was already formatted (e.g. contains 'success' key)
        if isinstance(data, dict) and 'success' in data:
            inner_success = data.get('success', success)
            inner_data = data.get('data', {}) if inner_success else {}
            inner_errors = data.get('errors') if not inner_success else None
            inner_message = data.get('message')
            if not inner_message:
                inner_message = "Request completed successfully" if inner_success else "An error occurred"
            inner_status_code = data.get('status_code', status_code)
            
            formatted_data = {
                "success": inner_success,
                "status_code": inner_status_code,
                "message": inner_message,
                "data": inner_data,
                "errors": inner_errors
            }
            return super().render(formatted_data, accepted_media_type, renderer_context)
            
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
