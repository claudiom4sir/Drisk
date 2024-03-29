package com.drisk.domain;

import com.google.gson.JsonObject;

public abstract class MissionCard implements Card {
	
	protected String text;
	
	public MissionCard(String text) {
		this.text = text;
	}
	
	public String getText() {
		return text;
	}
	
	public abstract boolean isAchievementReached(Player player);
	
	@Override
	public final JsonObject toJson() {
		JsonObject result = new JsonObject();
		result.addProperty("mission", text);
		return result;
	}
	
}
