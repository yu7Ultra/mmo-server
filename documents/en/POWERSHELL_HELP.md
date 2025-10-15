# 设置当前用户的 PowerShell 执行策略为 RemoteSigned

此命令将 PowerShell 的执行策略设置为 RemoteSigned，仅针对当前用户生效。RemoteSigned 策略允许运行本地创建的脚本，但要求从互联网下载的脚本必须有有效的签名。这有助于提升脚本安全性，同时允许用户在本地开发和运行脚本。

- `-ExecutionPolicy RemoteSigned`：指定执行策略为 RemoteSigned。
- `-Scope CurrentUser`：仅对当前用户生效，不影响其他用户或系统范围的设置。

`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`