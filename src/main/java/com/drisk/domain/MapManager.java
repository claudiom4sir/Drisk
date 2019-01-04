package com.drisk.domain;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.LinkedList;
import java.util.List;

import com.drisk.domain.exceptions.SyntaxException;
import com.drisk.technicalservice.JsonHelper;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class MapManager {

	private static MapManager instance;
	private String difficulty;
	private List<Continent> continents;
	private boolean ready;
	
	private static final String SYNTAXERROR = "SyntaxError: ";
	
	private MapManager() {
		continents = new LinkedList<>();
		ready = false;
	}

	public static MapManager getInstance() {
		if (instance == null)
			instance = new MapManager();
		return instance;
	}
	
	public String getDifficulty() {
		return difficulty;
	}
	
	public void createMap(JsonObject gameConfig) throws SyntaxException, FileNotFoundException {
		setDifficulty(JsonHelper.difficultyFromJson(gameConfig));
		if(difficulty.equals("custom"))
			createMapComponents(gameConfig);
		else
			createMapComponents(readDefaultMapFile());
	}
	
	private JsonObject readDefaultMapFile() throws FileNotFoundException {
		BufferedReader bufferedReader;
		FileReader file;
		try {
			file = new FileReader("default_map_" + difficulty + ".json");
		} catch (FileNotFoundException e) {
			throw new FileNotFoundException("FileNotFound: The map " + difficulty + "can't be loader");
		}
		bufferedReader = new BufferedReader(file);
		Gson json = new Gson();
		return json.fromJson(bufferedReader, JsonObject.class); 
	}
	
	private void createMapComponents(JsonObject gameConfig) throws SyntaxException {
		createContinents(JsonHelper.getContinentsFromJson(gameConfig));
		createTerritories(JsonHelper.getMembershipFromJson(gameConfig));
		createNeighbours(JsonHelper.getNeighbourhoodFromJson(gameConfig));
		ready = true;
	}
	
	
	
	private void createContinents(List<String> continentsNames) {
		for(String continentName : continentsNames) {
			Continent c = new Continent(continentName);
			addContinent(c);
		}	
	}
	
	private void createTerritories(java.util.Map<String, List<String>> relation) throws SyntaxException {
		for(java.util.Map.Entry<String, List<String>> entry : relation.entrySet()) {
			Continent c = findContinentByName(entry.getKey());
			if (c == null)
				throw new SyntaxException(SYNTAXERROR + entry.getKey() + " is not a valid continent");
			for(String territoryName : relation.get(c.getName())) {
				Territory t = new Territory(territoryName);
				c.addTerritory(t);
			}
		}
	}
	
	private void createNeighbours(java.util.Map<String, List<String>> relation) throws SyntaxException {
		for(java.util.Map.Entry<String, List<String>> entry : relation.entrySet()) {
			Territory t = findTerritoryByName(entry.getKey());
			if (t == null)
				throw new SyntaxException(SYNTAXERROR + entry.getKey() + " is not a valid territory");
			
			for(String neighbourName : relation.get(t.getName())) {
				Territory neighbour = findTerritoryByName(neighbourName);
				if (neighbour == null)
					throw new SyntaxException(SYNTAXERROR + neighbourName + 
							" is not a valid neighbour territory for " + t.getName());
				t.addNeighbour(neighbour);
				neighbour.addNeighbour(t);
			}
		}
	}
	
	private void addContinent(Continent continent) {
		if(!continents.contains(continent))
			continents.add(continent);
	}
	
	public Continent findContinentByName(String continentName) {
		for(Continent c : continents)
			if(c.getName().equals(continentName))
				return c;
		return null;
	}
	
	public Territory findTerritoryByName(String territoryName) {
		for(Continent c : continents)
			for(Territory t : c.getTerritories())
				if(t.getName().equals(territoryName))
					return t;
		return null;
	}
	
	private void setDifficulty(String difficulty) {
		this.difficulty = difficulty;
	}
	
	public List<Territory> getTerritories() {
		List<Territory> territories = new LinkedList<>();
		for(Continent c : continents)
			territories.addAll(c.getTerritories());
		return territories;
	}

	public List<Continent> getContinents() {
		return continents;
	}
	
	public JsonObject toJson() {
		return JsonHelper.mapToJson(difficulty, continents, getTerritories());
	}

	public boolean isReady() {
		return ready;
	}

	public void testCreateMap(JsonObject gameConfig) throws SyntaxException, FileNotFoundException {
		try {
			createMap(gameConfig);	
			destroy();
		}
		catch(SyntaxException e) {
			destroy();
			throw new SyntaxException(e.getMessage());
		}
		catch(FileNotFoundException e) {
			destroy();
			throw new FileNotFoundException();
		}
	}
	
	public static void destroy() {
		instance = null;
	}
	
}