import time

import datetime
import serial


# from models import Particle
class Recorder:

    def __init__(self):
        self.physicalPort = '/dev/serial0'

        self.serialPort = serial.Serial(self.physicalPort)  # open serial port

        self.BIN_SIZE = 300
        self.lastbin = int(time.time())

        self.sum_concPM1_0_CF1 = 0
        self.sum_concPM2_5_CF1 = 0
        self.sum_concPM10_0_CF1 = 0
        self.sum_concPM1_0_ATM = 0
        self.sum_concPM2_5_ATM = 0
        self.sum_concPM10_0_ATM = 0
        self.sum_rawGt0_3um = 0
        self.sum_rawGt0_5um = 0
        self.sum_rawGt1_0um = 0
        self.sum_rawGt2_5um = 0
        self.sum_rawGt5_0um = 0
        self.sum_rawGt10_0um = 0

        self.min_concPM1_0_CF1 = 99999
        self.min_concPM2_5_CF1 = 99999
        self.min_concPM10_0_CF1 = 99999
        self.min_concPM1_0_ATM = 99999
        self.min_concPM2_5_ATM = 99999
        self.min_concPM10_0_ATM = 99999
        self.min_rawGt0_3um = 99999
        self.min_rawGt0_5um = 99999
        self.min_rawGt1_0um = 99999
        self.min_rawGt2_5um = 99999
        self.min_rawGt5_0um = 99999
        self.min_rawGt10_0um = 99999

        self.max_concPM1_0_CF1 = 0
        self.max_concPM2_5_CF1 = 0
        self.max_concPM10_0_CF1 = 0
        self.max_concPM1_0_ATM = 0
        self.max_concPM2_5_ATM = 0
        self.max_concPM10_0_ATM = 0
        self.max_rawGt0_3um = 0
        self.max_rawGt0_5um = 0
        self.max_rawGt1_0um = 0
        self.max_rawGt2_5um = 0
        self.max_rawGt5_0um = 0
        self.max_rawGt10_0um = 0

        self.count = 0.0

    def PM10(self) -> int:

        # Check if we have enough data to read a payload
        if self.serialPort.in_waiting >= 32:

            # Check that we are reading the payload from the correct place (i.e. the start bits)
            if ord(self.serialPort.read()) == 0x42 and ord(self.serialPort.read()) == 0x4d:

                # Read the remaining payload data
                data = self.serialPort.read(30)

                # Extract the byte data by summing the bit shifted high byte with the low byte
                # Use ordinals in python to get the byte value rather than the char value
                # Standard particulate values in ug/m3
                self.concPM1_0_CF1 = data[3] + (data[2] << 8)
                self.concPM2_5_CF1 = data[5] + (data[4] << 8)
                self.concPM10_0_CF1 = data[7] + (data[6] << 8)
                # Atmospheric particulate values in ug/m3
                self.concPM1_0_ATM = data[9] + (data[8] << 8)
                self.concPM2_5_ATM = data[11] + (data[10] << 8)
                self.concPM10_0_ATM = data[15] + (data[14] << 8)
                # Raw counts per 0.1l
                self.rawGt0_3um = data[15] + (data[14] << 8)
                self.rawGt0_5um = data[17] + (data[16] << 8)
                self.rawGt1_0um = data[19] + (data[18] << 8)
                self.rawGt2_5um = data[21] + (data[20] << 8)
                self.rawGt5_0um = data[23] + (data[22] << 8)
                self.rawGt10_0um = data[25] + (data[24] << 8)
                self.payloadChecksum = data[29] + (data[28] << 8)

                # Calculate the payload checksum (not including the payload checksum bytes)
                inputChecksum = 0x42 + 0x4d
                for x in range(0, 27):
                    inputChecksum = inputChecksum + data[x]

                self.sum_concPM1_0_CF1 += self.concPM1_0_CF1
                self.sum_concPM2_5_CF1 += self.concPM2_5_CF1
                self.sum_concPM10_0_CF1 += self.concPM10_0_CF1
                self.sum_concPM1_0_ATM += self.concPM1_0_ATM
                self.sum_concPM2_5_ATM += self.concPM2_5_ATM
                self.sum_concPM10_0_ATM += self.concPM10_0_ATM
                self.sum_rawGt0_3um += self.rawGt0_3um
                self.sum_rawGt0_5um += self.rawGt0_5um
                self.sum_rawGt1_0um += self.rawGt1_0um
                self.sum_rawGt2_5um += self.rawGt2_5um
                self.sum_rawGt5_0um += self.rawGt5_0um
                self.sum_rawGt10_0um += self.rawGt10_0um

                self.min_concPM1_0_CF1 = min(self.concPM1_0_CF1, self.min_concPM1_0_CF1)
                self.min_concPM2_5_CF1 = min(self.concPM2_5_CF1, self.min_concPM2_5_CF1)
                self.min_concPM10_0_CF1 = min(self.concPM10_0_CF1, self.min_concPM10_0_CF1)
                self.min_concPM1_0_ATM = min(self.concPM1_0_ATM, self.min_concPM1_0_ATM)
                self.min_concPM2_5_ATM = min(self.concPM2_5_ATM, self.min_concPM2_5_ATM)
                self.min_concPM10_0_ATM = min(self.concPM10_0_ATM, self.min_concPM10_0_ATM)
                self.min_rawGt0_3um = min(self.rawGt0_3um, self.min_rawGt0_3um)
                self.min_rawGt0_5um = min(self.rawGt0_5um, self.min_rawGt0_5um)
                self.min_rawGt1_0um = min(self.rawGt1_0um, self.min_rawGt1_0um)
                self.min_rawGt2_5um = min(self.rawGt2_5um, self.min_rawGt2_5um)
                self.min_rawGt5_0um = min(self.rawGt5_0um, self.min_rawGt5_0um)
                self.min_rawGt10_0um = min(self.rawGt10_0um, self.min_rawGt10_0um)

                self.max_concPM1_0_CF1 = max(self.concPM1_0_CF1, self.max_concPM1_0_CF1)
                self.max_concPM2_5_CF1 = max(self.concPM2_5_CF1, self.max_concPM2_5_CF1)
                self.max_concPM10_0_CF1 = max(self.concPM10_0_CF1, self.max_concPM10_0_CF1)
                self.max_concPM1_0_ATM = max(self.concPM1_0_ATM, self.max_concPM1_0_ATM)
                self.max_concPM2_5_ATM = max(self.concPM2_5_ATM, self.max_concPM2_5_ATM)
                self.max_concPM10_0_ATM = max(self.concPM10_0_ATM, self.max_concPM10_0_ATM)
                self.max_rawGt0_3um = max(self.rawGt0_3um, self.max_rawGt0_3um)
                self.max_rawGt0_5um = max(self.rawGt0_5um, self.max_rawGt0_5um)
                self.max_rawGt1_0um = max(self.rawGt1_0um, self.max_rawGt1_0um)
                self.max_rawGt2_5um = max(self.rawGt2_5um, self.max_rawGt2_5um)
                self.max_rawGt5_0um = max(self.rawGt5_0um, self.max_rawGt5_0um)
                self.max_rawGt10_0um = max(self.rawGt10_0um, self.max_rawGt10_0um)

                currentTime = time.time()
                if self.lastbin + self.BIN_SIZE < currentTime:
                    self.lastbin = self.lastbin + self.BIN_SIZE
                    self.sum_concPM1_0_CF1 = 0
                    self.sum_concPM2_5_CF1 = 0
                    self.sum_concPM10_0_CF1 = 0
                    self.sum_concPM1_0_ATM = 0
                    self.sum_concPM2_5_ATM = 0
                    self.sum_concPM10_0_ATM = 0
                    self.sum_rawGt0_3um = 0
                    self.sum_rawGt0_5um = 0
                    self.sum_rawGt1_0um = 0
                    self.sum_rawGt2_5um = 0
                    self.sum_rawGt5_0um = 0
                    self.sum_rawGt10_0um = 0

                    self.min_concPM1_0_CF1 = 99999
                    self.min_concPM2_5_CF1 = 99999
                    self.min_concPM10_0_CF1 = 99999
                    self.min_concPM1_0_ATM = 99999
                    self.min_concPM2_5_ATM = 99999
                    self.min_concPM10_0_ATM = 99999
                    self.min_rawGt0_3um = 99999
                    self.min_rawGt0_5um = 99999
                    self.min_rawGt1_0um = 99999
                    self.min_rawGt2_5um = 99999
                    self.min_rawGt5_0um = 99999
                    self.min_rawGt10_0um = 99999

                    self.max_concPM1_0_CF1 = 0
                    self.max_concPM2_5_CF1 = 0
                    self.max_concPM10_0_CF1 = 0
                    self.max_concPM1_0_ATM = 0
                    self.max_concPM2_5_ATM = 0
                    self.max_concPM10_0_ATM = 0
                    self.max_rawGt0_3um = 0
                    self.max_rawGt0_5um = 0
                    self.max_rawGt1_0um = 0
                    self.max_rawGt2_5um = 0
                    self.max_rawGt5_0um = 0
                    self.max_rawGt10_0um = 0

                    self.count = 0

                # print("PM1 Atmospheric concentration = " + str(self.concPM10_0_ATM) + " ug/m3")
                if inputChecksum != self.payloadChecksum:
                    print("Warning! Checksums don't match!")
                    print("Calculated Checksum = " + str(inputChecksum))
                    print("Payload checksum = " + str(self.payloadChecksum))
                else:
                    self.count = self.count + 1
                    return self.concPM10_0_ATM
        return -1