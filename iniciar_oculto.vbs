Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Ejecutar servidor powershell completamente invisible (0 = oculto, false = asincrono)
cmd = "powershell.exe -NoLogo -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & currentDir & "\servidor_local.ps1"""
WshShell.Run cmd, 0, False
