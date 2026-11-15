// Knowledge gaps = questions the AI could NOT answer from the company docs.
// The same question asked several times (ignoring case and outer spaces) is
// one gap. "Who approves migrations?" and "who approves migrations? " match.
const Question = require('../models/Question');

// The grouping key, as a MongoDB expression: trimmed, lower-case text.
// The key the API returns is computed by MongoDB, and "Mark fixed" sends it
// back unchanged, so both sides always normalise the text the same way.
const GAP_KEY = { $toLower: { $trim: { input: '$question' } } };

// Open gaps (not yet marked fixed), most asked first.
// scope: from developerRefScope(user). limit: optional max number of groups.
async function openGaps(scope, limit) {
  const pipeline = [
    { $match: { ...scope, foundInDocs: false, resolved: false } },
    { $sort: { askedAt: -1 } }, // so $first below = the latest wording
    {
      $group: {
        _id: GAP_KEY,
        question: { $first: '$question' },
        count: { $sum: 1 },
        lastAskedAt: { $max: '$askedAt' },
        developers: { $addToSet: '$developer' },
      },
    },
    { $sort: { count: -1, lastAskedAt: -1 } },
  ];
  if (limit) pipeline.push({ $limit: limit });
  pipeline.push({
    $project: {
      _id: 0,
      key: '$_id',
      question: 1,
      count: 1,
      lastAskedAt: 1,
      developerCount: { $size: '$developers' },
    },
  });
  return Question.aggregate(pipeline);
}

module.exports = { GAP_KEY, openGaps };
