import { supabase } from './supabase';

interface AgentCreate {
  name: string;
  agentType: 'recommendation' | 'moderation' | 'pricing' | 'support' | 'matching' | 'forecasting';
  model: string;
  configuration?: Record<string, any>;
}

interface AgentAction {
  agentId: string;
  actionType: string;
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  confidenceScore?: number;
  executionTimeMs?: number;
  status?: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

interface RecommendationCreate {
  userId: string;
  recommendationType: 'provider' | 'service' | 'listing' | 'connection';
  recommendedItemId: string;
  recommendedItemType: string;
  reasoning?: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

interface ModerationRequest {
  contentId: string;
  contentType: 'post' | 'comment' | 'listing' | 'message' | 'review' | 'profile';
  contentText: string;
  contentMetadata?: Record<string, any>;
}

export class AIAgentsService {
  static async createAgent(agent: AgentCreate) {
    const { data, error } = await supabase
      .from('ai_agents')
      .insert({
        name: agent.name,
        agent_type: agent.agentType,
        model: agent.model,
        configuration: agent.configuration || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAgent(agentId: string) {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getAgentByType(agentType: string) {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getAllAgents() {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .order('agent_type');

    if (error) throw error;
    return data || [];
  }

  static async updateAgent(agentId: string, updates: Partial<AgentCreate>) {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.name) updateData.name = updates.name;
    if (updates.model) updateData.model = updates.model;
    if (updates.configuration) updateData.configuration = updates.configuration;

    const { data, error } = await supabase
      .from('ai_agents')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async toggleAgent(agentId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('ai_agents')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async logAction(action: AgentAction) {
    const { data, error } = await supabase.rpc('log_ai_agent_action', {
      agent_id_param: action.agentId,
      action_type_param: action.actionType,
      input_data_param: action.inputData,
      output_data_param: action.outputData || null,
      confidence_param: action.confidenceScore || null,
      execution_time_param: action.executionTimeMs || null,
      status_param: action.status || 'success',
      error_param: action.errorMessage || null,
    });

    if (error) throw error;
    return data;
  }

  static async getAgentActions(agentId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('ai_agent_actions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async updatePerformanceMetrics(agentId: string) {
    const { error } = await supabase.rpc('update_agent_performance_metrics', {
      agent_id_param: agentId,
    });

    if (error) throw error;
  }

  static async createRecommendation(recommendation: RecommendationCreate) {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .insert({
        user_id: recommendation.userId,
        recommendation_type: recommendation.recommendationType,
        recommended_item_id: recommendation.recommendedItemId,
        recommended_item_type: recommendation.recommendedItemType,
        reasoning: recommendation.reasoning,
        confidence_score: recommendation.confidenceScore,
        metadata: recommendation.metadata || {},
        expires_at: recommendation.expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserRecommendations(
    userId: string,
    recommendationType?: string,
    limit: number = 10
  ) {
    const { data, error } = await supabase.rpc('get_personalized_recommendations', {
      user_id_param: userId,
      rec_type: recommendationType || null,
      limit_param: limit,
    });

    if (error) throw error;
    return data || [];
  }

  static async acceptRecommendation(recommendationId: string, feedback?: string) {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .update({
        is_accepted: true,
        feedback: feedback || null,
      })
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async rejectRecommendation(recommendationId: string, feedback?: string) {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .update({
        is_accepted: false,
        feedback: feedback || null,
      })
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async moderateContent(request: ModerationRequest) {
    const agent = await this.getAgentByType('moderation');
    if (!agent) {
      throw new Error('Content moderation agent not available');
    }

    const startTime = Date.now();

    const result = await this.performModeration(request);

    const executionTime = Date.now() - startTime;

    await this.logAction({
      agentId: agent.id,
      actionType: 'moderate_content',
      inputData: {
        content_type: request.contentType,
        content_id: request.contentId,
      },
      outputData: result,
      confidenceScore: result.averageConfidence,
      executionTimeMs: executionTime,
      status: 'success',
    });

    const { data, error } = await supabase
      .from('ai_content_moderation')
      .insert({
        content_id: request.contentId,
        content_type: request.contentType,
        moderation_result: result.decision,
        flagged_categories: result.flaggedCategories,
        confidence_scores: result.confidenceScores,
        human_reviewed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return { moderation: data, decision: result.decision, categories: result.flaggedCategories };
  }

  private static async performModeration(request: ModerationRequest): Promise<any> {
    const text = request.contentText.toLowerCase();

    const categories = {
      spam: 0,
      harassment: 0,
      hate_speech: 0,
      violence: 0,
      adult_content: 0,
      misinformation: 0,
    };

    const spamKeywords = ['buy now', 'click here', 'limited time', 'act now'];
    const harassmentKeywords = ['stupid', 'idiot', 'loser'];
    const hateKeywords = ['hate'];
    const violenceKeywords = ['kill', 'hurt', 'attack'];
    const adultKeywords = ['explicit'];

    spamKeywords.forEach((keyword) => {
      if (text.includes(keyword)) categories.spam += 0.3;
    });
    harassmentKeywords.forEach((keyword) => {
      if (text.includes(keyword)) categories.harassment += 0.4;
    });
    hateKeywords.forEach((keyword) => {
      if (text.includes(keyword)) categories.hate_speech += 0.5;
    });
    violenceKeywords.forEach((keyword) => {
      if (text.includes(keyword)) categories.violence += 0.5;
    });
    adultKeywords.forEach((keyword) => {
      if (text.includes(keyword)) categories.adult_content += 0.4;
    });

    const flaggedCategories = Object.entries(categories)
      .filter(([, score]) => score > 0.3)
      .map(([category]) => category);

    const maxScore = Math.max(...Object.values(categories));
    const avgScore = Object.values(categories).reduce((a, b) => a + b, 0) / 6;

    let decision: 'safe' | 'review' | 'block' | 'warning';
    if (maxScore >= 0.8) {
      decision = 'block';
    } else if (maxScore >= 0.5) {
      decision = 'review';
    } else if (maxScore >= 0.3) {
      decision = 'warning';
    } else {
      decision = 'safe';
    }

    return {
      decision,
      flaggedCategories,
      confidenceScores: categories,
      averageConfidence: avgScore,
    };
  }

  static async getModerationResult(contentId: string, contentType: string) {
    const { data, error } = await supabase
      .from('ai_content_moderation')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async humanReviewModeration(
    moderationId: string,
    reviewerId: string,
    finalDecision: string,
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('ai_content_moderation')
      .update({
        human_reviewed: true,
        human_reviewer_id: reviewerId,
        final_decision: finalDecision,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', moderationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPendingModerationQueue(limit: number = 20) {
    const { data, error } = await supabase
      .from('ai_content_moderation')
      .select('*')
      .eq('moderation_result', 'review')
      .eq('human_reviewed', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getAgentPerformance(agentId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data, error } = await supabase
      .from('ai_agent_actions')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const actions = data || [];

    const stats = {
      total_actions: actions.length,
      successful_actions: actions.filter((a) => a.status === 'success').length,
      failed_actions: actions.filter((a) => a.status === 'failed').length,
      avg_execution_time: 0,
      avg_confidence: 0,
      success_rate: 0,
    };

    if (actions.length > 0) {
      const totalTime = actions.reduce((sum, a) => sum + (a.execution_time_ms || 0), 0);
      stats.avg_execution_time = totalTime / actions.length;

      const withConfidence = actions.filter((a) => a.confidence_score !== null);
      if (withConfidence.length > 0) {
        const totalConfidence = withConfidence.reduce(
          (sum, a) => sum + (a.confidence_score || 0),
          0
        );
        stats.avg_confidence = totalConfidence / withConfidence.length;
      }

      stats.success_rate = (stats.successful_actions / actions.length) * 100;
    }

    return stats;
  }

  static async getRecommendationStats(userId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const recommendations = data || [];

    const stats = {
      total: recommendations.length,
      accepted: recommendations.filter((r) => r.is_accepted === true).length,
      rejected: recommendations.filter((r) => r.is_accepted === false).length,
      pending: recommendations.filter((r) => r.is_accepted === null).length,
      acceptance_rate: 0,
      avg_confidence: 0,
    };

    const decidedRecs = stats.accepted + stats.rejected;
    if (decidedRecs > 0) {
      stats.acceptance_rate = (stats.accepted / decidedRecs) * 100;
    }

    if (recommendations.length > 0) {
      const totalConfidence = recommendations.reduce(
        (sum, r) => sum + (r.confidence_score || 0),
        0
      );
      stats.avg_confidence = totalConfidence / recommendations.length;
    }

    return stats;
  }

  static getAgentTypeLabel(agentType: string): string {
    const labels: Record<string, string> = {
      recommendation: 'Recommendation Engine',
      moderation: 'Content Moderation',
      pricing: 'Dynamic Pricing',
      support: 'Customer Support',
      matching: 'Smart Matching',
      forecasting: 'Demand Forecasting',
    };

    return labels[agentType] || agentType;
  }

  static getModerationResultColor(result: string): string {
    const colors: Record<string, string> = {
      safe: '#10B981',
      warning: '#F59E0B',
      review: '#3B82F6',
      block: '#DC2626',
    };

    return colors[result] || '#6B7280';
  }
}

export default AIAgentsService;
