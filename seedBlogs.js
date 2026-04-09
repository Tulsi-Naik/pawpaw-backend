const mongoose = require("mongoose");
require("dotenv").config();

const Blog = require("./models/Blog");

const blogs = [
{
  title: "How to Train Your Puppy Without Losing Your Mind 🐶",
  slug: "train-your-puppy-guide",
  category: "training",
image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1200&auto=format&fit=crop",
  content: `Bringing a puppy home is one of the happiest moments ever… until they start chewing your shoes.

The good news? Training your puppy doesn’t have to be stressful. In fact, it can be fun for both of you.

Start with the basics. Commands like “sit”, “stay”, and “come” should be your foundation. Keep sessions short — puppies have tiny attention spans.

Use positive reinforcement. This simply means rewarding good behavior with treats, praise, or even a belly rub. Dogs repeat what gets rewarded.

Consistency is everything. If you allow something today and forbid it tomorrow, your puppy will get confused. Make sure everyone in your home follows the same rules.

Accidents will happen. Don’t punish your puppy. Instead, gently redirect them and reward correct behavior.

Most importantly, be patient. Training isn’t about control — it’s about building trust.

A well-trained dog isn’t just obedient… they’re happier, more confident, and deeply connected to you.`
},

{
  title: "Dog Grooming 101: Keep Your Pup Fresh & Fabulous ✂️",
  slug: "dog-grooming-guide",
  category: "grooming",
  image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=1200&auto=format&fit=crop",
  content: `A clean dog is a happy dog… and honestly, a better-smelling house too.

Grooming isn’t just about looks — it’s essential for your dog’s health.

Start with brushing. Regular brushing removes dirt, prevents tangles, and reduces shedding. Long-haired breeds need daily attention, while short-haired dogs can manage with a few times a week.

Bathing depends on your dog’s lifestyle. If they love rolling in mud, you’ll need more frequent baths. Otherwise, once every 3–4 weeks is usually enough.

Don’t forget nails and ears. Overgrown nails can cause pain, and dirty ears can lead to infections.

Use dog-friendly products only. Human shampoos can irritate their skin.

Turn grooming into bonding time. Speak gently, reward them, and make it a positive experience.

When done right, grooming becomes something your dog actually enjoys — and you’ll love the results too.`
},

{
  title: "What Should You Really Feed Your Dog? 🍖",
  slug: "dog-food-guide",
  category: "food",
  image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee",
  content: `If you’ve ever stood in a pet store confused by food options… you’re not alone.

Your dog’s diet directly affects their energy, coat, and overall health.

A balanced diet should include protein, healthy fats, and essential nutrients. Protein helps build muscles, while fats provide energy.

Avoid feeding too many human foods. Chocolate, onions, and grapes are dangerous for dogs.

Consistency matters. Sudden changes in diet can upset your dog’s stomach.

Always keep fresh water available.

And remember — every dog is different. Age, breed, and activity level all play a role in what they need.

When in doubt, consult a vet.

Feeding your dog right isn’t complicated… but it makes a huge difference in their happiness and lifespan.`
},

{
  title: "Before You Adopt a Dog — Read This First ❤️",
  slug: "before-adopting-dog",
  category: "adoption",
  image: "https://images.unsplash.com/photo-1558788353-f76d92427f16",
  content: `Adopting a dog is exciting… but it’s also a big responsibility.

Dogs need time, attention, and care every single day.

Ask yourself — do you have the time for walks, grooming, and play? Dogs are social animals and can get lonely easily.

Financially, there are costs like food, vet visits, and grooming.

Your lifestyle matters too. A high-energy dog may not suit a quiet home.

Adoption is not temporary. It’s a commitment for years.

But here’s the beautiful part — the love you get in return is unmatched.

If you’re ready, adoption can be one of the most rewarding decisions of your life.`
},

{
  title: "Why Daily Walks Are More Important Than You Think 🐕",
  slug: "importance-of-dog-walks",
  category: "health",
  image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a",
  content: `For dogs, walks are not just exercise… they’re an adventure.

Daily walks help maintain a healthy weight and prevent behavioral issues.

They also provide mental stimulation. New smells, sounds, and sights keep your dog engaged.

Skipping walks can lead to boredom, anxiety, and destructive behavior.

Even 30 minutes a day can make a huge difference.

Think of walks as your dog’s favorite part of the day — because they are.

And honestly? They’re pretty good for you too.`
}
];

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Blog.deleteMany();

    await Blog.insertMany(blogs);

    console.log("✅ Blogs upgraded");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedData();