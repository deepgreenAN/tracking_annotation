from tracker_factory import factory


class Config:
  def __init__(self):
    self.make_video = False
    self.is_cpu = True
    self.tracker = factory("SiamMask", self.is_cpu)
    #self.tracker = factory("SiamRPN", self.is_cpu)

config = Config()

if __name__ == "__main__":
  pass