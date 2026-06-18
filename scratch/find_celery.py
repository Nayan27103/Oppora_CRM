import subprocess
import os
import sys

def find_and_restart():
    try:
        ps_cmd = 'Get-CimInstance Win32_Process -Filter "name = \'python.exe\'" | Select-Object CommandLine, ProcessId | ConvertTo-Json'
        output = subprocess.check_output(['powershell', '-Command', ps_cmd]).decode()
        import json
        data = json.loads(output)
        if not isinstance(data, list):
            data = [data]
        
        for proc in data:
            cmdline = proc.get('CommandLine') or ''
            pid = proc.get('ProcessId')
            if 'celery' in cmdline.lower():
                print(f"Found Celery worker process: PID {pid}, Command: {cmdline}")
                print(f"Killing process {pid}...")
                subprocess.call(['taskkill', '/F', '/PID', str(pid)])
                print("Killed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    find_and_restart()
