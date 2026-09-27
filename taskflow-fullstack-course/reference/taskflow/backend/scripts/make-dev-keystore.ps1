# S50 (50.07) · PROVIDED. A self-signed key for https://localhost:8443 (DEVELOPMENT ONLY: browsers will warn).
#   cd backend; .\scripts\make-dev-keystore.ps1
#   java -Dport=8081 -Dhttps.keystore=target/dev-keystore.p12 -cp "…" com.taskflow.DevServer
New-Item -ItemType Directory -Force target | Out-Null
# keytool ships with the JDK but often isn't on PATH on Windows: find it through java.home.
$javaHome = ((java -XshowSettings:properties -version 2>&1) | Select-String 'java.home = ').Line.Split('=')[1].Trim()
$keytool = Join-Path $javaHome 'bin\keytool.exe'
& $keytool -genkeypair -alias taskflow -keyalg RSA -keysize 2048 -validity 365 `
  -storetype PKCS12 -keystore target/dev-keystore.p12 -storepass changeit `
  -dname "CN=localhost, OU=Development, O=TaskFlow" -ext "SAN=dns:localhost,ip:127.0.0.1"