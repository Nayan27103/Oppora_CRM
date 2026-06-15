from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import LoginSerializer
from .serializers import RegisterSerializer
from rest_framework.permissions import IsAuthenticated



class RegisterView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            return Response(
                {
                    "success": True,
                    "message": "User registered",
                    "data": {
                        "id": user.id,
                        "email": user.email
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

class MeView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response({
            "success": True,
            "data": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "phone": request.user.phone
            }
        })

class ForgotPasswordView(APIView):
    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from .models import User

        email = request.data.get("email")
        if not email:
            return Response({"success": False, "message": "Email is required"}, status=400)
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Send email asynchronously using our Celery task
            from notifications.tasks import send_email_task
            reset_link = f"http://localhost:5173/reset-password/{uid}/{token}/"
            
            send_email_task.delay(
                user.id,
                "Oppora CRM - Password Reset Request",
                (
                    f"Hello {user.username},\n\n"
                    f"We received a request to reset your Oppora CRM password. Click the link below to set a new password:\n\n"
                    f"{reset_link}\n\n"
                    f"If you did not make this request, please ignore this email.\n\n"
                    f"Thank you,\n"
                    f"Oppora CRM Team"
                )
            )
            return Response({"success": True, "message": "Password reset email sent successfully"})
        except User.DoesNotExist:
            # Prevent user enumeration
            return Response({"success": True, "message": "Password reset email sent successfully"})

class ResetPasswordView(APIView):
    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from .models import User

        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        
        if not all([uidb64, token, new_password]):
            return Response({"success": False, "message": "UID, token, and new password are required"}, status=400)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"success": False, "message": "Invalid password reset link"}, status=400)
            
        if not default_token_generator.check_token(user, token):
            return Response({"success": False, "message": "Invalid or expired password reset link"}, status=400)
            
        if len(new_password) < 8:
            return Response({"success": False, "message": "Password must be at least 8 characters long"}, status=400)
            
        user.set_password(new_password)
        user.save()
        return Response({"success": True, "message": "Password has been reset successfully"})

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        
        if not old_password or not new_password:
            return Response({"success": False, "message": "Old password and new password are required"}, status=400)
            
        user = request.user
        if not user.check_password(old_password):
            return Response({"success": False, "message": "Incorrect old password"}, status=400)
            
        if len(new_password) < 8:
            return Response({"success": False, "message": "New password must be at least 8 characters long"}, status=400)
            
        user.set_password(new_password)
        user.save()
        return Response({"success": True, "message": "Password has been changed successfully"})