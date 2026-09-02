$code = @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public class SimpleHttpServer {
    private TcpListener listener;
    private string rootDir;
    private bool isRunning;

    public void Start(int port, string root) {
        rootDir = root;
        listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        isRunning = true;
        ThreadPool.QueueUserWorkItem(ListenLoop);
    }

    private void ListenLoop(object state) {
        while (isRunning) {
            try {
                var client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            } catch { }
        }
    }

    private void HandleClient(object obj) {
        var client = (TcpClient)obj;
        try {
            using (var stream = client.GetStream()) {
                stream.ReadTimeout = 3000;
                var buffer = new byte[4096];
                int read = stream.Read(buffer, 0, buffer.Length);
                if (read <= 0) return;

                string req = Encoding.ASCII.GetString(buffer, 0, read);
                string[] lines = req.Split(new[] { "\r\n" }, StringSplitOptions.None);
                if (lines.Length == 0) return;

                string[] parts = lines[0].Split(' ');
                if (parts.Length < 2) return;

                string method = parts[0].ToUpper();
                string rawPath = parts[1].Split('?')[0];
                rawPath = Uri.UnescapeDataString(rawPath);
                if (rawPath == "/" || string.IsNullOrEmpty(rawPath)) rawPath = "/Overlay-principal/index.html";

                string relPath = rawPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(rootDir, relPath);
                if (Directory.Exists(filePath)) filePath = Path.Combine(filePath, "index.html");

                if (File.Exists(filePath)) {
                    byte[] fileBytes = File.ReadAllBytes(filePath);
                    string ext = Path.GetExtension(filePath).ToLower();
                    string mime = "text/html; charset=utf-8";
                    if (ext == ".css") mime = "text/css; charset=utf-8";
                    else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                    else if (ext == ".json") mime = "application/json; charset=utf-8";
                    else if (ext == ".png") mime = "image/png";
                    else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                    else if (ext == ".svg") mime = "image/svg+xml";
                    else if (ext == ".mp3") mime = "audio/mpeg";
                    else if (ext == ".wav") mime = "audio/wav";
                    else if (ext == ".woff" || ext == ".woff2" || ext == ".ttf") mime = "font/" + ext.TrimStart('.');

                    string header = "HTTP/1.1 200 OK\r\nContent-Type: " + mime + "\r\nContent-Length: " + fileBytes.Length + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                    byte[] headerBytes = Encoding.ASCII.GetBytes(header);
                    stream.Write(headerBytes, 0, headerBytes.Length);
                    if (method != "HEAD") {
                        stream.Write(fileBytes, 0, fileBytes.Length);
                    }
                } else {
                    byte[] notFound = Encoding.UTF8.GetBytes("404 Not Found: " + rawPath);
                    string header = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " + notFound.Length + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                    byte[] headerBytes = Encoding.ASCII.GetBytes(header);
                    stream.Write(headerBytes, 0, headerBytes.Length);
                    if (method != "HEAD") {
                        stream.Write(notFound, 0, notFound.Length);
                    }
                }
                stream.Flush();
                stream.Close();
            }
        } catch { }
        finally {
            try { client.Close(); } catch { }
        }
    }
}
'@

Add-Type -TypeDefinition $code

$port = 3000
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$server = New-Object SimpleHttpServer
$server.Start($port, $root)

Write-Host "============================================================"
Write-Host "   SERVIDOR LOCAL OVERLAYS MITHANDS ACTIVO (0 ms) "
Write-Host "============================================================"
Write-Host ("  Overlay: http://localhost:" + $port + "/Overlay-principal/index.html")
Write-Host ("  Dock:    http://localhost:" + $port + "/Overlay-principal/master-dock.html")
Write-Host "============================================================"

while ($true) {
    Start-Sleep -Seconds 10
}
