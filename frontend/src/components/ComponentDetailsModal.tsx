import React from 'react';
import { X, Star, Clock, DollarSign, Zap, Cpu, Wifi, Activity, Battery, CircuitBoard, ExternalLink, User, Calendar, TrendingUp, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface ComponentDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  manufacturer?: string;
  model_number?: string;
  specifications?: Record<string, string>;
  tags?: string[];
  datasheet_url?: string;
  image_url?: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  operating_voltage_min?: number;
  operating_voltage_max?: number;
  operating_current?: number;
  power_consumption?: number;
  interface_type?: string;
  pin_count?: number;
  package_type?: string;
  reviews?: Array<{
    id: string;
    user_name: string;
    rating: number;
    review_text: string;
    pros?: string[];
    cons?: string[];
    use_case?: string;
    difficulty_level?: string;
    created_at: string;
  }>;
  projects?: Array<{
    id: string;
    project_name: string;
    project_description: string;
    project_url?: string;
    difficulty_level?: string;
    estimated_time?: string;
  }>;
  alternatives?: Array<{
    id: string;
    name: string;
    reason: string;
    compatibility_score: number;
  }>;
  stats?: {
    average_rating: number;
    review_count: number;
    project_count: number;
    alternative_count: number;
  };
}

interface ComponentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: ComponentDetails | null;
  isLoading?: boolean;
}

const ComponentDetailsModal: React.FC<ComponentDetailsModalProps> = ({
  isOpen,
  onClose,
  component,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('microcontroller')) return Cpu;
    if (categoryLower.includes('sensor')) return Activity;
    if (categoryLower.includes('communication') || categoryLower.includes('wifi')) return Wifi;
    if (categoryLower.includes('power') || categoryLower.includes('battery')) return Battery;
    if (categoryLower.includes('motor')) return Zap;
    return CircuitBoard;
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'expert': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            {component && (
              <>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  {React.createElement(getCategoryIcon(component.category), {
                    className: "w-6 h-6 text-white"
                  })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{component.name}</h2>
                  <p className="text-muted-foreground">{component.category}</p>
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading component details...</p>
            </div>
          ) : component ? (
            <div className="p-6">
              {/* Overview Section */}
              <div className="mb-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Overview</h3>
                    <p className="text-muted-foreground mb-4">{component.description}</p>
                    
                    {component.stats && (
                      <div className="flex items-center gap-4 mb-4">
                        {component.stats.average_rating > 0 && (
                          <div className="flex items-center gap-2">
                            {renderStarRating(component.stats.average_rating)}
                            <span className="text-sm text-muted-foreground">
                              ({component.stats.review_count} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {component.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Quick Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-semibold text-lg text-gradient">{component.price}</span>
                      </div>
                      
                      {component.manufacturer && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Manufacturer</span>
                          <span className="font-medium">{component.manufacturer}</span>
                        </div>
                      )}
                      
                      {component.model_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-medium">{component.model_number}</span>
                        </div>
                      )}
                      
                      {component.package_type && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Package</span>
                          <span className="font-medium">{component.package_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Tabbed Content */}
              <Tabs defaultValue="specifications" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({component.stats?.review_count || 0})</TabsTrigger>
                  <TabsTrigger value="projects">Projects ({component.stats?.project_count || 0})</TabsTrigger>
                  <TabsTrigger value="alternatives">Alternatives ({component.stats?.alternative_count || 0})</TabsTrigger>
                </TabsList>

                {/* Specifications Tab */}
                <TabsContent value="specifications" className="mt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Technical Specifications */}
                    {component.specifications && Object.keys(component.specifications).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Wrench className="w-5 h-5" />
                            Technical Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(component.specifications).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Electrical Characteristics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Electrical Characteristics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {component.operating_voltage_min && component.operating_voltage_max && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Operating Voltage</span>
                              <span className="font-medium">
                                {component.operating_voltage_min}V - {component.operating_voltage_max}V
                              </span>
                            </div>
                          )}
                          
                          {component.operating_current && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Operating Current</span>
                              <span className="font-medium">{component.operating_current}mA</span>
                            </div>
                          )}
                          
                          {component.power_consumption && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Power Consumption</span>
                              <span className="font-medium">{component.power_consumption}W</span>
                            </div>
                          )}
                          
                          {component.interface_type && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Interface</span>
                              <span className="font-medium">{component.interface_type}</span>
                            </div>
                          )}
                          
                          {component.pin_count && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pin Count</span>
                              <span className="font-medium">{component.pin_count}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Physical Dimensions */}
                    {component.dimensions && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Physical Dimensions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Width</span>
                              <span className="font-medium">{component.dimensions.width}{component.dimensions.unit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Height</span>
                              <span className="font-medium">{component.dimensions.height}{component.dimensions.unit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Depth</span>
                              <span className="font-medium">{component.dimensions.depth}{component.dimensions.unit}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Links */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ExternalLink className="w-5 h-5" />
                          Resources
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {component.datasheet_url && (
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => window.open(component.datasheet_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Datasheet
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(component.name + ' ' + component.manufacturer)}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Search Online
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-6">
                  {component.reviews && component.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {component.reviews.map((review) => (
                        <Card key={review.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">{review.user_name}</span>
                                  {review.difficulty_level && (
                                    <Badge variant="outline" className={getDifficultyColor(review.difficulty_level)}>
                                      {review.difficulty_level}
                                    </Badge>
                                  )}
                                </div>
                                {renderStarRating(review.rating)}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {new Date(review.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">{review.review_text}</p>
                            
                            {review.use_case && (
                              <div className="mb-4">
                                <h4 className="font-medium mb-2">Use Case</h4>
                                <p className="text-sm text-muted-foreground">{review.use_case}</p>
                              </div>
                            )}
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              {review.pros && review.pros.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-green-600 mb-2">Pros</h4>
                                  <ul className="text-sm space-y-1">
                                    {review.pros.map((pro, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-green-500 mt-1">+</span>
                                        <span>{pro}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {review.cons && review.cons.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-red-600 mb-2">Cons</h4>
                                  <ul className="text-sm space-y-1">
                                    {review.cons.map((con, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-red-500 mt-1">-</span>
                                        <span>{con}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No reviews yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Be the first to review this component!</p>
                    </div>
                  )}
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="mt-6">
                  {component.projects && component.projects.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {component.projects.map((project) => (
                        <Card key={project.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{project.project_name}</CardTitle>
                              {project.difficulty_level && (
                                <Badge variant="outline" className={getDifficultyColor(project.difficulty_level)}>
                                  {project.difficulty_level}
                                </Badge>
                              )}
                            </div>
                            {project.estimated_time && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {project.estimated_time}
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">{project.project_description}</p>
                            {project.project_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(project.project_url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Project
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CircuitBoard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No projects available</p>
                      <p className="text-sm text-muted-foreground mt-2">Check back later for project ideas using this component!</p>
                    </div>
                  )}
                </TabsContent>

                {/* Alternatives Tab */}
                <TabsContent value="alternatives" className="mt-6">
                  {component.alternatives && component.alternatives.length > 0 ? (
                    <div className="space-y-4">
                      {component.alternatives.map((alternative) => (
                        <Card key={alternative.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{alternative.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Compatibility</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={alternative.compatibility_score * 10} className="w-16" />
                                  <span className="text-sm font-medium">{alternative.compatibility_score}/10</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{alternative.reason}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No alternatives available</p>
                      <p className="text-sm text-muted-foreground mt-2">This component doesn't have any listed alternatives yet.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CircuitBoard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Component details not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentDetailsModal;