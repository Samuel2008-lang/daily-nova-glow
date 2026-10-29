package com.forgexdigital.dailynova;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import com.forgexdigital.dailynova.R;

/** DN_WIDGET: renders upcoming Daily Nova reminders from Capacitor Preferences. */
public class DailyNovaWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_TEXT = { R.id.dn_row1_text, R.id.dn_row2_text, R.id.dn_row3_text, R.id.dn_row4_text };
    private static final int[] ROW_TIME = { R.id.dn_row1_time, R.id.dn_row2_time, R.id.dn_row3_time, R.id.dn_row4_time };
    private static final int[] ROW = { R.id.dn_row1, R.id.dn_row2, R.id.dn_row3, R.id.dn_row4 };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    private void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.dailynova_widget);
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("dn_widget_reminders", null);

        int shown = 0;
        try {
            if (raw != null) {
                JSONArray items = new JSONObject(raw).optJSONArray("items");
                if (items != null) {
                    for (int i = 0; i < items.length() && i < ROW.length; i++) {
                        JSONObject item = items.getJSONObject(i);
                        views.setTextViewText(ROW_TEXT[i], item.optString("text", ""));
                        views.setTextViewText(ROW_TIME[i], item.optString("when", ""));
                        views.setViewVisibility(ROW[i], View.VISIBLE);
                        shown++;
                    }
                }
            }
        } catch (Exception ignored) {}

        for (int i = shown; i < ROW.length; i++) views.setViewVisibility(ROW[i], View.GONE);
        views.setViewVisibility(R.id.dn_empty, shown == 0 ? View.VISIBLE : View.GONE);

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            PendingIntent pi = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.dn_widget_root, pi);
        }
        manager.updateAppWidget(widgetId, views);
    }
}
