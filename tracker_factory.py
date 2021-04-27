from trackers import SiamMaskTracker, SiamRPNTracker, SiamRPNTrackerV2, SiamMaskTrackerV2
from trackers import CSRTTracker, KCFTracker, GoTurnTracker

tracker_symbols = [
  "SiamMask",
  "SiamMaskV2",
  "SiamRPN",
  #"SiamRPNV2", # エラーが出る
  "CSRT",
  "KCF",
  #"GoTurn"  # エラーが出る
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
  #elif symbol_str=="SiamRPNV2":
  #  return SiamRPNTrackerV2(is_cpu=is_cpu)
  elif symbol_str=="CSRT":
    return CSRTTracker()
  elif symbol_str=="KCF":
    return KCFTracker()
  #elif symbol_str=="GoTurn":
  #  return GoTurnTracker()


if __name__ == "__main__":
  pass