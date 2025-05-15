import time
import datetime
import pytz as pytz
import serial

ser = serial.Serial('/dev/serial0', baudrate=9600, timeout=1)

try:
	print('begin')

	while True:		
		
		data = ser.read(32)
		print("".join(f"{byte:08b}" for byte in data))
		
except KeyboardInterrupt:
	print("Stopped")

finally:
	print('done')
	ser.close()
