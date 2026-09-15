Set sh = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root

Function Exists(p)
  Exists = (p <> "") And fso.FileExists(p)
End Function

node = ""
c0 = root & "\runtime\node.exe"
c1 = sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
c2 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\nodejs\node.exe")
c3 = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe")
If Exists(c0) Then
  node = c0
ElseIf Exists(c1) Then
  node = c1
ElseIf Exists(c2) Then
  node = c2
ElseIf Exists(c3) Then
  node = c3
End If

If node <> "" Then
  sh.Run """" & node & """ """ & root & "\launch.js""", 0, False
  WScript.Quit 0
End If

ps = sh.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")
If Exists(ps) Then
  sh.Run """" & ps & """ -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\sunucu.ps1""", 0, False
  WScript.Quit 0
End If

MsgBox "YURT acilamadi. Klasoru Windows 10/11 bilgisayara kopyalayip YURT.vbs dosyasina cift tiklayin. Edge veya Chrome gerekir.", 16, "YURT"
