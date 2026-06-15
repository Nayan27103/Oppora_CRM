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