// Optimistic transaction harness: enforces read-before-write and retries on
// document/query version conflicts. It does not replace an emulator integration test.
export class MemoryFirestore {
  constructor() { this.reset(); }
  reset() { this.records = new Map(); this.versions = new Map(); this.serial = 0; this.conflicts = 0; this.beforeCommit = null; }
  collection(name) { return new Query(this, name); }
  snapshot(ref) {
    const value = this.records.get(ref.path);
    return { id: ref.id, ref, exists: value !== undefined, data: () => value === undefined ? undefined : structuredClone(value) };
  }
  write(ref, value, mode) {
    if (mode === "delete") this.records.delete(ref.path);
    else this.records.set(ref.path, structuredClone(mode === "update" ? { ...this.records.get(ref.path), ...value } : value));
    this.versions.set(ref.path, (this.versions.get(ref.path) || 0) + 1);
    const collection = ref.path.split("/")[0];
    this.versions.set(collection, (this.versions.get(collection) || 0) + 1);
  }
  async runTransaction(callback) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const reads = new Map();
      const writes = [];
      const get = async ref => {
        if (writes.length) throw new Error("Firestore transactions require all reads before writes.");
        const key = ref.path || ref.name;
        reads.set(key, this.versions.get(key) || 0);
        return ref.get();
      };
      const tx = { get, getAll: (...refs) => Promise.all(refs.map(get)) };
      for (const mode of ["set", "update", "create", "delete"]) tx[mode] = (ref, value) => writes.push({ ref, value, mode });
      const result = await callback(tx);
      if (this.beforeCommit) { const hook = this.beforeCommit; this.beforeCommit = null; await hook(); }
      if ([...reads].some(([key, version]) => (this.versions.get(key) || 0) !== version)) { this.conflicts++; continue; }
      for (const { ref, mode } of writes) {
        if (mode === "create" && this.records.has(ref.path)) throw new Error("Already exists");
        if (mode === "update" && !this.records.has(ref.path)) throw new Error("Not found");
      }
      for (const { ref, value, mode } of writes) this.write(ref, value, mode);
      return result;
    }
    throw new Error("Contention limit");
  }
}

class Query {
  constructor(db, name, filters = [], maximum = Infinity, cursor = "") { Object.assign(this, { db, name, filters, maximum, cursor }); }
  doc(id) {
    const db = this.db;
    const path = this.name + "/" + (id || "auto-" + ++db.serial);
    const ref = { path, id: path.split("/")[1] };
    ref.get = async () => db.snapshot(ref);
    ref.set = async (value, options) => db.write(ref, value, options?.merge ? "update" : "set");
    ref.create = async value => { if (db.records.has(path)) throw new Error("Already exists"); db.write(ref, value, "set"); };
    ref.update = async value => db.write(ref, value, "update");
    return ref;
  }
  where(field, operator, value) {
    if (operator !== "==") throw new Error("Unsupported query");
    return new Query(this.db, this.name, [...this.filters, [field, value]], this.maximum, this.cursor);
  }
  limit(maximum) { return new Query(this.db, this.name, this.filters, maximum, this.cursor); }
  orderBy() { return this; }
  startAfter(snapshot) { return new Query(this.db, this.name, this.filters, this.maximum, snapshot.id); }
  async get() {
    const docs = [...this.db.records.keys()].filter(path => path.startsWith(this.name + "/"))
      .map(path => this.db.snapshot(this.doc(path.split("/")[1])))
      .filter(snap => snap.id > this.cursor && this.filters.every(([field, value]) => snap.data()[field] === value))
      .sort((a, b) => a.id.localeCompare(b.id)).slice(0, this.maximum);
    return { docs, size: docs.length, empty: !docs.length };
  }
}
