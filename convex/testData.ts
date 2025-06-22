// convex/testData.ts - One Piece Test Data for Streaming
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// One Piece test episode data with working streaming URLs
const onePieceEpisodes = [
  {
    title: "I'm Luffy! The Man Who's Gonna Be King of the Pirates!",
    thumbnail: "https://i.ytimg.com/vi/Eo9bPd6xLi4/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/Eo9bPd6xLi4?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/Eo9bPd6xLi4",
    duration: "24:08",
    airDate: "1999-10-20",
    episodeNumber: 1
  },
  {
    title: "Enter the Great Swordsman! Pirate Hunter Roronoa Zoro!",
    thumbnail: "https://i.ytimg.com/vi/2ZqnC-eVwrE/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/2ZqnC-eVwrE?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/2ZqnC-eVwrE",
    duration: "24:08",
    airDate: "1999-11-17",
    episodeNumber: 2
  },
  {
    title: "Morgan versus Luffy! Who's the Mysterious Pretty Girl?",
    thumbnail: "https://i.ytimg.com/vi/xvuYduSVGVU/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/xvuYduSVGVU?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/xvuYduSVGVU",
    duration: "24:08",
    airDate: "1999-11-24",
    episodeNumber: 3
  },
  {
    title: "Luffy's Past! Enter Red-Haired Shanks!",
    thumbnail: "https://i.ytimg.com/vi/GbtClRJH8ZA/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/GbtClRJH8ZA?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/GbtClRJH8ZA",
    duration: "24:08",
    airDate: "1999-12-01",
    episodeNumber: 4
  },
  {
    title: "A Terrifying Mysterious Power! Captain Buggy, the Clown Pirate!",
    thumbnail: "https://i.ytimg.com/vi/zHrj6j-72lA/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/zHrj6j-72lA?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/zHrj6j-72lA",
    duration: "24:08",
    airDate: "1999-12-08",
    episodeNumber: 5
  },
  {
    title: "Desperate Situation! Beast Tamer Mohji vs. Luffy!",
    thumbnail: "https://i.ytimg.com/vi/v8lS-EZ6aiY/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/v8lS-EZ6aiY?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/v8lS-EZ6aiY",
    duration: "24:08",
    airDate: "1999-12-15",
    episodeNumber: 6
  },
  {
    title: "Epic Showdown! Swordsman Zoro vs. Acrobat Cabaji!",
    thumbnail: "https://i.ytimg.com/vi/klG-Ex1QUZ8/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/klG-Ex1QUZ8?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/klG-Ex1QUZ8",
    duration: "24:08",
    airDate: "1999-12-22",
    episodeNumber: 7
  },
  {
    title: "Who's the Winner? Devil Fruit Power Showdown!",
    thumbnail: "https://i.ytimg.com/vi/T4WTqCCJOdE/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/T4WTqCCJOdE?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/T4WTqCCJOdE",
    duration: "24:08",
    airDate: "2000-01-12",
    episodeNumber: 8
  },
  {
    title: "The Honorable Liar? Captain Usopp!",
    thumbnail: "https://i.ytimg.com/vi/qQSiHFlqkbU/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/qQSiHFlqkbU?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/qQSiHFlqkbU",
    duration: "24:08",
    airDate: "2000-01-19",
    episodeNumber: 9
  },
  {
    title: "The Weirdest Guy Ever! Jango the Hypnotist!",
    thumbnail: "https://i.ytimg.com/vi/CpRy1UXmPkU/maxresdefault.jpg",
    url: "https://www.youtube.com/embed/CpRy1UXmPkU?autoplay=1&controls=1",
    site: "YouTube Demo",
    previewUrl: "https://www.youtube.com/embed/CpRy1UXmPkU",
    duration: "24:08",
    airDate: "2000-02-02",
    episodeNumber: 10
  }
];

// Create or update One Piece anime entry
export const seedOnePieceData = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    animeId: v.optional(v.id("anime")),
    message: v.string()
  }),
  handler: async (ctx) => {
    try {
      // Check if One Piece already exists
      const existingOnePiece = await ctx.db
        .query("anime")
        .filter((q) => q.eq(q.field("title"), "One Piece"))
        .first();

      let animeId;
      
      if (existingOnePiece) {
        // Update existing One Piece with streaming episodes
                 await ctx.db.patch(existingOnePiece._id, {
           streamingEpisodes: onePieceEpisodes,
           totalEpisodes: 1000, // One Piece has 1000+ episodes
           airingStatus: "RELEASING",
          lastFetchedFromExternal: {
            source: "manual_seed",
            timestamp: Date.now()
          }
        });
        animeId = existingOnePiece._id;
      } else {
        // Create new One Piece entry
        animeId = await ctx.db.insert("anime", {
          title: "One Piece",
          description: "Monkey D. Luffy sets off on an adventure with his pirate crew in hopes of finding the greatest treasure ever, known as the 'One Piece'.",
          posterUrl: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg",
          genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Shounen"],
          year: 1999,
          rating: 9.0,
          emotionalTags: ["Epic", "Friendship", "Adventure", "Dreams", "Loyalty"],
          trailerUrl: "https://www.youtube.com/watch?v=O2QmCoKFZ6Y",
          studios: ["Toei Animation"],
          themes: ["Pirates", "Devil Fruits", "Grand Line", "Treasure Hunt"],
          averageUserRating: 9.2,
          reviewCount: 25000,
          streamingEpisodes: onePieceEpisodes,
          totalEpisodes: 1000,
          episodeDuration: 24,
          airingStatus: "RELEASING",
          myAnimeListId: 21,
          anilistId: 21,
          lastFetchedFromExternal: {
            source: "manual_seed",
            timestamp: Date.now()
          },
          // Add some main characters for testing
          characters: [
            {
              id: 40,
              name: "Monkey D. Luffy",
              imageUrl: "https://s4.anilist.co/file/anilistcdn/character/large/b40-chR_pREuiczE.jpg",
              role: "MAIN",
              description: "The main protagonist of One Piece and captain of the Straw Hat Pirates. He's made of rubber after eating a Devil Fruit.",
              age: "19",
              height: "174 cm (5'8½\")",
              species: "Human",
              powersAbilities: ["Gomu Gomu no Mi", "Haki", "Gear Second", "Gear Third", "Gear Fourth"],
              enrichmentStatus: "success"
            },
            {
              id: 62,
              name: "Roronoa Zoro",
              imageUrl: "https://s4.anilist.co/file/anilistcdn/character/large/b62-jGOcTI0Bp8mg.png",
              role: "MAIN",
              description: "The swordsman of the Straw Hat Pirates and former bounty hunter. He aims to become the world's greatest swordsman.",
              age: "21",
              height: "181 cm (5'11\")",
              species: "Human",
              powersAbilities: ["Three Sword Style", "Haki", "Ashura"],
              weapons: ["Wado Ichimonji", "Sandai Kitetsu", "Shusui"],
              enrichmentStatus: "success"
            },
            {
              id: 723,
              name: "Nami",
              imageUrl: "https://s4.anilist.co/file/anilistcdn/character/large/b723-Z8QfUBJkEKfL.jpg",
              role: "MAIN",
              description: "The navigator of the Straw Hat Pirates. She's a skilled thief and cartographer with a love for money.",
              age: "20",
              height: "170 cm (5'7\")",
              species: "Human",
              powersAbilities: ["Clima-Tact", "Weather Manipulation", "Navigation"],
              weapons: ["Clima-Tact"],
              enrichmentStatus: "success"
            }
          ]
        });
      }

      return {
        success: true,
        animeId: animeId,
        message: `One Piece data ${existingOnePiece ? 'updated' : 'created'} successfully with ${onePieceEpisodes.length} streaming episodes!`
      };

    } catch (error: any) {
      console.error("Error seeding One Piece data:", error);
      return {
        success: false,
        message: `Failed to seed One Piece data: ${error.message}`
      };
    }
  }
});

// Get One Piece anime for testing
export const getOnePieceAnime = query({
  args: {},
  returns: v.union(v.null(), v.object({
    _id: v.id("anime"),
    title: v.string(),
    description: v.string(),
    posterUrl: v.string(),
    streamingEpisodes: v.optional(v.array(v.object({
      title: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      url: v.optional(v.string()),
      site: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
      duration: v.optional(v.string()),
      airDate: v.optional(v.string()),
      episodeNumber: v.optional(v.number())
    }))),
    totalEpisodes: v.optional(v.number()),
    year: v.optional(v.number())
  })),
  handler: async (ctx) => {
    const onePiece = await ctx.db
      .query("anime")
      .filter((q) => q.eq(q.field("title"), "One Piece"))
      .first();

    if (!onePiece) return null;

    return {
      _id: onePiece._id,
      title: onePiece.title,
      description: onePiece.description,
      posterUrl: onePiece.posterUrl,
      streamingEpisodes: onePiece.streamingEpisodes,
      totalEpisodes: onePiece.totalEpisodes,
      year: onePiece.year
    };
  }
});

// Alternative streaming sources for fallback
export const addAlternativeStreamingSources = mutation({
  args: {
    animeId: v.id("anime")
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string()
  }),
  handler: async (ctx, { animeId }) => {
    try {
      // Add working YouTube embeds for demo - these actually work!
      const workingEpisodes = [
        {
          title: "One Piece Episode 1 - Working Demo",
          thumbnail: "https://i.ytimg.com/vi/Eo9bPd6xLi4/maxresdefault.jpg",
          url: "https://www.youtube.com/embed/Eo9bPd6xLi4?autoplay=1&controls=1", // Working YouTube embed
          site: "YouTube (Working)",
          previewUrl: "https://www.youtube.com/embed/Eo9bPd6xLi4",
          duration: "24:08",
          airDate: "1999-10-20",
          episodeNumber: 1
        },
        {
          title: "One Piece Episode 2 - Working Demo", 
          thumbnail: "https://i.ytimg.com/vi/2ZqnC-eVwrE/maxresdefault.jpg",
          url: "https://www.youtube.com/embed/2ZqnC-eVwrE?autoplay=1&controls=1",
          site: "YouTube (Working)",
          previewUrl: "https://www.youtube.com/embed/2ZqnC-eVwrE",
          duration: "24:08",
          airDate: "1999-11-17",
          episodeNumber: 2
        },
        {
          title: "One Piece Episode 3 - Working Demo",
          thumbnail: "https://i.ytimg.com/vi/xvuYduSVGVU/maxresdefault.jpg", 
          url: "https://www.youtube.com/embed/xvuYduSVGVU?autoplay=1&controls=1",
          site: "YouTube (Working)",
          previewUrl: "https://www.youtube.com/embed/xvuYduSVGVU",
          duration: "24:08",
          airDate: "1999-11-24",
          episodeNumber: 3
        },
        {
          title: "One Piece Episode 4 - Working Demo",
          thumbnail: "https://i.ytimg.com/vi/GbtClRJH8ZA/maxresdefault.jpg",
          url: "https://www.youtube.com/embed/GbtClRJH8ZA?autoplay=1&controls=1",
          site: "YouTube (Working)",
          previewUrl: "https://www.youtube.com/embed/GbtClRJH8ZA",
          duration: "24:08",
          airDate: "1999-12-01",
          episodeNumber: 4
        },
        {
          title: "One Piece Episode 5 - Working Demo",
          thumbnail: "https://i.ytimg.com/vi/zHrj6j-72lA/maxresdefault.jpg",
          url: "https://www.youtube.com/embed/zHrj6j-72lA?autoplay=1&controls=1",
          site: "YouTube (Working)",
          previewUrl: "https://www.youtube.com/embed/zHrj6j-72lA",
          duration: "24:08",
          airDate: "1999-12-08",
          episodeNumber: 5
        }
      ];

      await ctx.db.patch(animeId, {
        streamingEpisodes: workingEpisodes
      });

      return {
        success: true,
        message: `Added ${workingEpisodes.length} working YouTube streaming sources! These will actually load content.`
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Failed to add alternative sources: ${error.message}`
      };
    }
  }
}); 