from trackers import SiamMaskTracker, SiamRPNTracker, SiamRPNTrackerV2, SiamMaskTrackerV2

tracker_symbol = ["SiamMask", "SiamMaskV2", "SiamRPN", "SiamRPNV2"]

def factory(symbol_str, is_cpu=True):
  if symbol_str not in tracker_symbol:
    raise Exception("tracker must be in {}".format(tracker_symbol))

  if symbol_str=="SiamMask":
    return SiamMaskTracker(is_cpu=is_cpu)
  elif symbol_str=="SiamMaskV2":
    return SiamMaskTrackerV2(is_cpu=is_cpu)
  elif symbol_str=="SiamRPN":
    return SiamRPNTracker(is_cpu=is_cpu)
  elif symbol_str=="SiamRPNV2":
    return SiamRPNTrackerV2(is_cpu=is_cpu)


if __name__ == "__main__":
  pass