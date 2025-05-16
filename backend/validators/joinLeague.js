// backend/validators/joinLeague.js
import Joi from 'joi';

export const joinLeagueSchema = Joi.object({
  leagueId: Joi.string().length(24).hex().required()
});
