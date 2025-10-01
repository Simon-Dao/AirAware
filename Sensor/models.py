#SECTION - This is a deprecated file, however, it may be useful later on when we 
# integrate the model into the pipeline

from django.db import models

class BackupModel(models.Model):

    class Meta:
        abstract = True

    def save(self, using='default', stop_recurse=False):
        if stop_recurse:
            super().save(using = using)
            return
        try:
            backedup = self.__class__.objects.using('local').all()  # get everything in the local database and move it to the real database if we have connectivity again
#            for backup in backedup:
                #backup.pk = None
                #backup.save(using='default', stop_recurse=True)
            super().save(using='default')
        except:
            print("error -- saving locally")
            super().save(using='local')   #if we can't connect, save it locally



# Create your models here.
class Particle(BackupModel):
    sensorId = models.IntegerField(default = -1)
    timestamp = models.DateTimeField()

#These are average values
    pm1 = models.FloatField(default = -1)
    pm25 = models.FloatField(default = -1)
    pm10 = models.FloatField(default = -1)
    pm1ae = models.FloatField(default = -1)
    pm25ae = models.FloatField(default = -1)
    pm10ae = models.FloatField(default = -1)
    pm031l = models.FloatField(default = -1)
    pm051l = models.FloatField(default = -1)
    pm11l = models.FloatField(default = -1)
    pm251l = models.FloatField(default = -1)
    pm501l = models.FloatField(default = -1)
    pm101l = models.FloatField(default = -1)

    pm1Min = models.IntegerField(default = -1)
    pm25Min = models.IntegerField(default = -1)
    pm10Min = models.IntegerField(default = -1)
    pm1aeMin = models.IntegerField(default = -1)
    pm25aeMin = models.IntegerField(default = -1)
    pm10aeMin = models.IntegerField(default = -1)
    pm031lMin = models.IntegerField(default = -1)
    pm051lMin = models.IntegerField(default = -1)
    pm11lMin = models.IntegerField(default = -1)
    pm251lMin = models.IntegerField(default = -1)
    pm501lMin = models.IntegerField(default = -1)
    pm101lMin = models.IntegerField(default = -1)

    pm1Max = models.IntegerField(default = -1)
    pm25Max = models.IntegerField(default = -1)
    pm10Max = models.IntegerField(default = -1)
    pm1aeMax = models.IntegerField(default = -1)
    pm25aeMax = models.IntegerField(default = -1)
    pm10aeMax = models.IntegerField(default = -1)
    pm031lMax = models.IntegerField(default = -1)
    pm051lMax = models.IntegerField(default = -1)
    pm11lMax = models.IntegerField(default = -1)
    pm251lMax = models.IntegerField(default = -1)
    pm501lMax = models.IntegerField(default = -1)
    pm101lMax = models.IntegerField(default = -1)

class Occupancy(BackupModel):
    sensorId = models.IntegerField(default = -1)
    timestamp = models.DateTimeField()
    occupancy = models.IntegerField()

class Device(BackupModel):
    sensorId = models.IntegerField(default = -1)
    timestamp = models.DateTimeField()
    mac = models.CharField(max_length = 18, default='')
    rssi = models.IntegerField()
    channel = models.IntegerField()

    
