const { getPool } = require('./db');

/**
 * Ghi vết vật thể đã xóa vào Thùng rác (recycle_bin) để khôi phục sau này
 */
async function logDeletedItem({ itemType, itemId, itemTitle, itemData, deletedBy }) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO recycle_bin (item_type, item_id, item_title, item_data, deleted_by, deleted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [itemType, itemId || null, itemTitle || 'Không tên', JSON.stringify(itemData || {}), deletedBy || 'Hệ thống']
    );
    console.log(`🗑️ [RECYCLE BIN] Đã lưu bản ghi xóa [${itemType}] "${itemTitle}" bởi ${deletedBy}`);
  } catch (err) {
    console.error('❌ [RECYCLE BIN LOG ERROR]', err.message);
  }
}

module.exports = { logDeletedItem };
