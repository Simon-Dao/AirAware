import time

import serial

#from models import Particle
user_id = int()

physicalPort = '/dev/serial0'

serialPort = serial.Serial(physicalPort)  # open serial port

print('beginning')

BIN_SIZE = 300
lastbin = int(time.time())

sum_concPM1_0_CF1 = 0
sum_concPM2_5_CF1 = 0
sum_concPM10_0_CF1 = 0
sum_concPM1_0_ATM = 0
sum_concPM2_5_ATM = 0
sum_concPM10_0_ATM = 0
sum_rawGt0_3um = 0
sum_rawGt0_5um = 0
sum_rawGt1_0um = 0
sum_rawGt2_5um = 0
sum_rawGt5_0um = 0
sum_rawGt10_0um = 0

min_concPM1_0_CF1 = 99999
min_concPM2_5_CF1 = 99999
min_concPM10_0_CF1 = 99999
min_concPM1_0_ATM = 99999
min_concPM2_5_ATM = 99999
min_concPM10_0_ATM = 99999
min_rawGt0_3um = 99999
min_rawGt0_5um = 99999
min_rawGt1_0um = 99999
min_rawGt2_5um = 99999
min_rawGt5_0um = 99999
min_rawGt10_0um = 99999

max_concPM1_0_CF1 = 0
max_concPM2_5_CF1 = 0
max_concPM10_0_CF1 = 0
max_concPM1_0_ATM = 0
max_concPM2_5_ATM = 0
max_concPM10_0_ATM = 0
max_rawGt0_3um = 0
max_rawGt0_5um = 0
max_rawGt1_0um = 0
max_rawGt2_5um = 0
max_rawGt5_0um = 0
max_rawGt10_0um = 0

count = 0.0

print(serialPort)

while True:
        
    # Check if we have enough data to read a payload
    if serialPort.in_waiting >= 32:
                
        # Check that we are reading the payload from the correct place (i.e. the start bits)
        if ord(serialPort.read()) == 0x42 and ord(serialPort.read()) == 0x4d:

            # Read the remaining payload data
            data = serialPort.read(30)
                        
            # Extract the byte data by summing the bit shifted high byte with the low byte
            # Use ordinals in python to get the byte value rather than the char value
            frameLength = data[1] + (data[0] << 8)
            # Standard particulate values in ug/m3
            concPM1_0_CF1 = data[3] + (data[2] << 8)
            concPM2_5_CF1 = data[5] + (data[4] << 8)
            concPM10_0_CF1 = data[7] + (data[6] << 8)
            # Atmospheric particulate values in ug/m3
            concPM1_0_ATM = data[9] + (data[8] << 8)
            concPM2_5_ATM = data[11] + (data[10] << 8)
            concPM10_0_ATM = data[15] + (data[14] << 8)
            # Raw counts per 0.1l
            rawGt0_3um = data[15] + (data[14] << 8)
            rawGt0_5um = data[17] + (data[16] << 8)
            rawGt1_0um = data[19] + (data[18] << 8)
            rawGt2_5um = data[21] + (data[20] << 8)
            rawGt5_0um = data[23] + (data[22] << 8)
            rawGt10_0um = data[25] + (data[24] << 8)
            # Misc data
            version = data[26]
            errorCode = data[27]
            payloadChecksum = data[29] + (data[28] << 8)

            # Calculate the payload checksum (not including the payload checksum bytes)
            inputChecksum = 0x42 + 0x4d
            for x in range(0, 27):
                inputChecksum = inputChecksum + data[x]

            # Clear the screen before displaying the next set of data
            #            os.system('cls')  # Set to 'cls' on Windows, 'clear' on linux
            #            print("PMS7003 Sensor Data:")
            #            print("PM1.0 = " + str(concPM1_0_CF1) + " ug/m3")
            #            print("PM2.5 = " + str(concPM2_5_CF1) + " ug/m3")
            #            print("PM10 = " + str(concPM10_0_CF1) + " ug/m3")

            sum_concPM1_0_CF1 += concPM1_0_CF1
            sum_concPM2_5_CF1 += concPM2_5_CF1
            sum_concPM10_0_CF1 += concPM10_0_CF1
            sum_concPM1_0_ATM += concPM1_0_ATM
            sum_concPM2_5_ATM += concPM2_5_ATM
            sum_concPM10_0_ATM += concPM10_0_ATM
            sum_rawGt0_3um += rawGt0_3um
            sum_rawGt0_5um += rawGt0_5um
            sum_rawGt1_0um += rawGt1_0um
            sum_rawGt2_5um += rawGt2_5um
            sum_rawGt5_0um += rawGt5_0um
            sum_rawGt10_0um += rawGt10_0um

            min_concPM1_0_CF1 = min(concPM1_0_CF1, min_concPM1_0_CF1)
            min_concPM2_5_CF1 = min(concPM2_5_CF1, min_concPM2_5_CF1)
            min_concPM10_0_CF1 = min(concPM10_0_CF1, min_concPM10_0_CF1)
            min_concPM1_0_ATM = min(concPM1_0_ATM, min_concPM1_0_ATM)
            min_concPM2_5_ATM = min(concPM2_5_ATM, min_concPM2_5_ATM)
            min_concPM10_0_ATM = min(concPM10_0_ATM, min_concPM10_0_ATM)
            min_rawGt0_3um = min(rawGt0_3um, min_rawGt0_3um)
            min_rawGt0_5um = min(rawGt0_5um, min_rawGt0_5um)
            min_rawGt1_0um = min(rawGt1_0um, min_rawGt1_0um)
            min_rawGt2_5um = min(rawGt2_5um, min_rawGt2_5um)
            min_rawGt5_0um = min(rawGt5_0um, min_rawGt5_0um)
            min_rawGt10_0um = min(rawGt10_0um, min_rawGt10_0um)

            max_concPM1_0_CF1 = max(concPM1_0_CF1, max_concPM1_0_CF1)
            max_concPM2_5_CF1 = max(concPM2_5_CF1, max_concPM2_5_CF1)
            max_concPM10_0_CF1 = max(concPM10_0_CF1, max_concPM10_0_CF1)
            max_concPM1_0_ATM = max(concPM1_0_ATM, max_concPM1_0_ATM)
            max_concPM2_5_ATM = max(concPM2_5_ATM, max_concPM2_5_ATM)
            max_concPM10_0_ATM = max(concPM10_0_ATM, max_concPM10_0_ATM)
            max_rawGt0_3um = max(rawGt0_3um, max_rawGt0_3um)
            max_rawGt0_5um = max(rawGt0_5um, max_rawGt0_5um)
            max_rawGt1_0um = max(rawGt1_0um, max_rawGt1_0um)
            max_rawGt2_5um = max(rawGt2_5um, max_rawGt2_5um)
            max_rawGt5_0um = max(rawGt5_0um, max_rawGt5_0um)
            max_rawGt10_0um = max(rawGt10_0um, max_rawGt10_0um)

            currentTime = time.time()
            if lastbin + BIN_SIZE < currentTime:
                
                lastbin = lastbin + BIN_SIZE
                sum_concPM1_0_CF1 = 0
                sum_concPM2_5_CF1 = 0
                sum_concPM10_0_CF1 = 0
                sum_concPM1_0_ATM = 0
                sum_concPM2_5_ATM = 0
                sum_concPM10_0_ATM = 0
                sum_rawGt0_3um = 0
                sum_rawGt0_5um = 0
                sum_rawGt1_0um = 0
                sum_rawGt2_5um = 0
                sum_rawGt5_0um = 0
                sum_rawGt10_0um = 0

                min_concPM1_0_CF1 = 99999
                min_concPM2_5_CF1 = 99999
                min_concPM10_0_CF1 = 99999
                min_concPM1_0_ATM = 99999
                min_concPM2_5_ATM = 99999
                min_concPM10_0_ATM = 99999
                min_rawGt0_3um = 99999
                min_rawGt0_5um = 99999
                min_rawGt1_0um = 99999
                min_rawGt2_5um = 99999
                min_rawGt5_0um = 99999
                min_rawGt10_0um = 99999

                max_concPM1_0_CF1 = 0
                max_concPM2_5_CF1 = 0
                max_concPM10_0_CF1 = 0
                max_concPM1_0_ATM = 0
                max_concPM2_5_ATM = 0
                max_concPM10_0_ATM = 0
                max_rawGt0_3um = 0
                max_rawGt0_5um = 0
                max_rawGt1_0um = 0
                max_rawGt2_5um = 0
                max_rawGt5_0um = 0
                max_rawGt10_0um = 0

                count = 0

            print("PM1 Atmospheric concentration = " + str(concPM10_0_ATM) + " ug/m3")
            #            print("PM2.5 Atmospheric concentration = " + str(concPM2_5_ATM) + " ug/m3")
            #            print("PM10 Atmospheric concentration = " + str(concPM10_0_ATM) + " ug/m3")
            #            print("Count: 0.3um = " + str(rawGt0_3um) + " per 0.1l")
            #            print("Count: 0.5um = " + str(rawGt0_5um) + " per 0.1l")
            #            print("Count: 1.0um = " + str(rawGt1_0um) + " per 0.1l")
            #            print("Count: 2.5um = " + str(rawGt2_5um) + " per 0.1l")
            #            print("Count: 5.0um = " + str(rawGt5_0um) + " per 0.1l")
            #            print("Count: 10um = " + str(rawGt10_0um) + " per 0.1l")
            #            print("Version = " + str(version))
            #            print("Error Code = " + str(errorCode))
            #            print("Frame length = " + str(frameLength))
            if inputChecksum != payloadChecksum:
                print("Warning! Checksums don't match!")
                print("Calculated Checksum = " + str(inputChecksum))
                print("Payload checksum = " + str(payloadChecksum))
    time.sleep(0.7)  # 0.7 seconds is Maximum recommended delay (as per data sheet)
    count = count + 1

















