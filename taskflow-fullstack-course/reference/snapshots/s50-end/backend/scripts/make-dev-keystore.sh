#!/bin/sh
# S50 (50.07) · PROVIDED. A self-signed key for https://localhost:8443 (DEVELOPMENT ONLY: browsers will warn).
#   cd backend && sh scripts/make-dev-keystore.sh
#   java -Dport=8081 -Dhttps.keystore=target/dev-keystore.p12 -cp "…" com.taskflow.DevServer
mkdir -p target
keytool -genkeypair -alias taskflow -keyalg RSA -keysize 2048 -validity 365 \
  -storetype PKCS12 -keystore target/dev-keystore.p12 -storepass changeit \
  -dname "CN=localhost, OU=Development, O=TaskFlow" -ext "SAN=dns:localhost,ip:127.0.0.1"