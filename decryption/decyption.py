import subprocess
# decrption mọi link m3u8 nhớ là fake device không nó check nó vả cho vỡ mồm
link = input("Nhập liên kết m3u8: ")

user_agent = "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36"

subprocess.run(['ffmpeg', '-user_agent', user_agent, '-i', link, 'track.mp3'])



# Mozilla/5.0 (Linux; Android 11; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36
# Mozilla/5.0 (Linux; Android 11; SM-G981U) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Mobile Safari/537.36
# Mozilla/5.0 (Linux; Android 11; IN2025) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.101 Mobile Safari/537.36 SamsungBrowser/14.0
# Mozilla/5.0 (Linux; Android 10; Mi 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36 OPR/77.0.4054.146
# Mozilla/5.0 (Linux; Android 10; ELS-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36 UCBrowser/13.2.0.1296