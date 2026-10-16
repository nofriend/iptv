/**************************
小红书带货视频精准过滤脚本
托管地址: https://raw.githubusercontent.com/nofriend/iptv/refs/heads/main/xhs_remove_goods.js
***************************/

let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 判断单条数据是否带有商品/带货属性
        function isGoodsVideo(item) {
            if (!item) return false;
            let note = item.note_card || item.note || item;

            // 1. 显性广告标识
            if (item.is_ad || note.is_ad || note.type === "ad_card" || note.card_type === "ad" || item.ads_tag) return true;

            // 2. 带货商品卡片、绑定的商品、店铺卡片
            if (note.goods_card || note.anchor_info || note.goods_bind_info || note.related_goods) return true;
            if (note.video_goods || note.cooperation_bind || note.shop_card || note.goods_info) return true;

            // 3. 检查 anchors 数组（挂载的商品、搜索商品、店铺等）
            if (Array.isArray(note.anchors) && note.anchors.length > 0) {
                let hasGoods = note.anchors.some(a => 
                    a.type === "goods" || a.type === "search_goods" || a.type === "shop" || a.type === "brand"
                );
                if (hasGoods) return true;
            }

            // 4. 检查 bottom_bar 及交互控件
            if (note.bottom_bar && (note.bottom_bar.type === "goods" || note.bottom_bar.goods_info)) return true;
            if (note.interact_info && (note.interact_info.relation_goods || note.interact_info.goods_info || note.interact_info.custom_anchor)) return true;
            if (Array.isArray(note.widgets) && note.widgets.some(w => w.type === "goods" || w.type === "anchor" || w.type === "card")) return true;

            // 5. 扫描价格、已售数量等带货特征关键字
            let rawStr = JSON.stringify(note);
            if (
                rawStr.includes('"goods_id"') || 
                rawStr.includes('"price_info"') || 
                rawStr.includes('"sales_text"') || 
                rawStr.includes('"bought_text"') ||
                rawStr.includes("已售") ||
                rawStr.includes("限时立减") ||
                rawStr.includes("券后价")
            ) {
                return true;
            }

            return false;
        }

        // 清理单节点残余的商品 UI（防止视频保留了但底部弹卡片）
        function purgeGoodsUI(item) {
            if (!item) return item;
            let note = item.note_card || item.note || item;

            delete note.goods_card;
            delete note.anchor_info;
            delete note.goods_bind_info;
            delete note.related_goods;
            delete note.video_goods;
            delete note.cooperation_bind;
            delete note.shop_card;
            delete note.goods_info;
            delete note.bottom_bar;
            delete note.anchors;

            if (note.interact_info) {
                delete note.interact_info.relation_goods;
                delete note.interact_info.goods_info;
                delete note.interact_info.custom_anchor;
            }

            return item;
        }

        // 统一过滤数组
        function cleanArray(list) {
            if (!Array.isArray(list)) return list;
            return list
                .filter(item => !isGoodsVideo(item)) // 踢掉带货视频
                .map(item => purgeGoodsUI(item));    // 对普通视频做 UI 保底清洗
        }

        // 递归替换数据
        if (obj.data) {
            if (Array.isArray(obj.data)) {
                obj.data = cleanArray(obj.data);
            } else if (obj.data.items && Array.isArray(obj.data.items)) {
                obj.data.items = cleanArray(obj.data.items);
            } else if (obj.data.notes && Array.isArray(obj.data.notes)) {
                obj.data.notes = cleanArray(obj.data.notes);
            }
        }

        if (obj.items && Array.isArray(obj.items)) {
            obj.items = cleanArray(obj.items);
        }

        $done({ body: JSON.stringify(obj) });

    } catch (e) {
        $done({});
    }
} else {
    $done({});
}
