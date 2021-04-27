from trackers.opencv_tracker import CSRTTracker, KCFTracker
from trackers.pysot_trackers import SiamMaskTrackerV2, SiamRPNTracker
from trackers.siamese_mask_tracker import SiamMaskTracker

tracker_symbols = [
  "SiamMask",
  "SiamMaskV2",
  "SiamRPN",
  "CSRT",
  "KCF",
]

def factory(symbol_str, is_cpu=True):
  if symbol_str not in tracker_symbols:
    raise Exception("tracker must be in {}".format(tracker_symbols))

  if symbol_str=="SiamMask":
    return SiamMaskTracker(is_cpu=is_cpu)
  elif symbol_str=="SiamMaskV2":
    return SiamMaskTrackerV2(is_cpu=is_cpu)
  elif symbol_str=="SiamRPN":
    return SiamRPNTracker(is_cpu=is_cpu)
  elif symbol_str=="CSRT":
    return CSRTTracker()
  elif symbol_str=="KCF":
    return KCFTracker()


if __name__ == "__main__":
  pass