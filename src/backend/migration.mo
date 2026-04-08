import Map "mo:core/Map";

module {
  // Old actor stable fields consumed by this migration
  // Note: erpDataStoreEntries no longer exists in previous version,
  // so we only consume erpDataStore which is already a stable Map.
  type OldActor = {
    erpDataStore : Map.Map<Text, Text>;
  };

  // New actor stable fields produced by migration
  type NewActor = {
    erpDataStore : Map.Map<Text, Text>;
  };

  // Pass erpDataStore through unchanged.
  public func run(old : OldActor) : NewActor {
    { erpDataStore = old.erpDataStore };
  };
};
