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
    

    