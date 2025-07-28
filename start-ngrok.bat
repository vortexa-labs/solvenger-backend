@echo off
echo Starting ngrok tunnel for mobile testing...
echo.
echo Your backend will be available at the URL shown below
echo Update your frontend to use this URL for mobile testing
echo.
ngrok http 3000 