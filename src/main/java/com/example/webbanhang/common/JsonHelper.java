package com.example.webbanhang.common;

import java.util.Map;
import java.util.HashMap;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class JsonHelper {
    public static String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(escape(entry.getKey())).append("\":");
            sb.append(valueToJson(entry.getValue()));
        }
        sb.append("}");
        return sb.toString();
    }

    private static String valueToJson(Object value) {
        if (value == null) return "null";
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        if (value instanceof LocalDateTime ldt) return "\"" + ldt.toString() + "\"";
        if (value instanceof java.util.Date date) return "\"" + date.toString() + "\"";
        return "\"" + escape(value.toString()) + "\"";
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public static Map<String, Object> fromJson(String json) {
        Map<String, Object> map = new HashMap<>();
        if (json == null || json.trim().isEmpty()) return map;
        String content = json.trim();
        if (content.startsWith("{") && content.endsWith("}")) {
            content = content.substring(1, content.length() - 1).trim();
        }
        if (content.isEmpty()) return map;

        int length = content.length();
        int i = 0;
        while (i < length) {
            // Find key
            while (i < length && content.charAt(i) != '"') i++;
            if (i >= length) break;
            i++; // skip "
            int keyStart = i;
            while (i < length && content.charAt(i) != '"') {
                if (content.charAt(i) == '\\') i++;
                i++;
            }
            String key = content.substring(keyStart, i).replace("\\\"", "\"").replace("\\\\", "\\");
            i++; // skip "
            
            // Find colon
            while (i < length && content.charAt(i) != ':') i++;
            i++; // skip :
            while (i < length && Character.isWhitespace(content.charAt(i))) i++;
            
            // Find value
            if (i >= length) break;
            Object value = null;
            if (content.charAt(i) == '"') {
                i++; // skip "
                int valStart = i;
                while (i < length && content.charAt(i) != '"') {
                    if (content.charAt(i) == '\\') i++;
                    i++;
                }
                value = content.substring(valStart, i).replace("\\\"", "\"").replace("\\\\", "\\");
                i++; // skip "
            } else {
                int valStart = i;
                while (i < length && content.charAt(i) != ',' && content.charAt(i) != '}') {
                    i++;
                }
                String valStr = content.substring(valStart, i).trim();
                if ("null".equalsIgnoreCase(valStr)) {
                    value = null;
                } else if ("true".equalsIgnoreCase(valStr)) {
                    value = true;
                } else if ("false".equalsIgnoreCase(valStr)) {
                    value = false;
                } else {
                    try {
                        if (valStr.contains(".")) {
                            value = new BigDecimal(valStr);
                        } else {
                            value = Long.parseLong(valStr);
                        }
                    } catch (NumberFormatException e) {
                        value = valStr;
                    }
                }
            }
            map.put(key, value);
            while (i < length && content.charAt(i) != ',') i++;
            i++; // skip ,
        }
        return map;
    }
}
