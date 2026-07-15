Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "ngrok http 3000", 0, False