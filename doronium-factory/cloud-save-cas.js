/* Compare-and-swap writes for the existing per-user cloud save row. */
export async function compareAndSwapCloudSave(client, { row, expectedUpdatedAt = null } = {}) {
  if (!client || typeof client.from !== "function" || !row ||
      typeof row.user_id !== "string" || !row.user_id ||
      typeof row.storage_key !== "string" || !row.storage_key ||
      !row.storage_value || typeof row.storage_value !== "object") {
    return { ok: false, conflict: false, reason: "INVALID_CLOUD_SAVE_ARGUMENT" };
  }

  if (expectedUpdatedAt) {
    const { data, error } = await client.from("dori_cloud_storage")
      .update({
        storage_value: row.storage_value,
        is_deleted: false,
        updated_at: row.updated_at
      })
      .eq("user_id", row.user_id)
      .eq("storage_key", row.storage_key)
      .eq("updated_at", expectedUpdatedAt)
      .select("updated_at")
      .maybeSingle();
    if (error) return { ok: false, conflict: false, reason: "UPDATE_FAILED", error };
    if (!data) return { ok: false, conflict: true, reason: "REVISION_CONFLICT" };
    return { ok: true, conflict: false, updatedAt: data.updated_at || row.updated_at, operation: "UPDATE" };
  }

  const { data, error } = await client.from("dori_cloud_storage")
    .insert(row)
    .select("updated_at")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, conflict: true, reason: "INITIAL_INSERT_CONFLICT" };
    return { ok: false, conflict: false, reason: "INSERT_FAILED", error };
  }
  if (!data) return { ok: false, conflict: false, reason: "INSERT_NOT_CONFIRMED" };
  return { ok: true, conflict: false, updatedAt: data.updated_at || row.updated_at, operation: "INSERT" };
}
