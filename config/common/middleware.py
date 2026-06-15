import time

class RequestTimeMiddleware:

    def __init__(self, get_response):

        self.get_response = get_response

    def __call__(self, request):

        start_time = time.time()

        response = self.get_response(request)

        end_time = time.time()

        execution_time = round(
            end_time - start_time,
            4
        )

        print(
            f"{request.method} "
            f"{request.path} "
            f"executed in "
            f"{execution_time} sec"
        )

        return response

class RequestLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time
        from common.models import RequestLog
        from rest_framework_simplejwt.authentication import JWTAuthentication

        start_time = time.time()

        response = self.get_response(request)

        execution_time = round(time.time() - start_time, 4)

        # Authenticate JWT token in middleware since standard django auth won't parse JWT headers
        user = request.user if request.user and request.user.is_authenticated else None
        if not user:
            try:
                jwt_authenticator = JWTAuthentication()
                header = jwt_authenticator.get_header(request)
                if header:
                    raw_token = jwt_authenticator.get_raw_token(header)
                    validated_token = jwt_authenticator.get_validated_token(raw_token)
                    user = jwt_authenticator.get_user(validated_token)
            except Exception:
                user = None

        try:
            RequestLog.objects.create(
                user=user if user and user.is_authenticated else None,
                path=request.path[:1024],
                method=request.method,
                execution_time=execution_time
            )
        except Exception:
            # Prevent middleware failure from breaking requests
            pass

        return response
    

    