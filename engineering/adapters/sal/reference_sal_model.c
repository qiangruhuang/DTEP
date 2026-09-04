#include <stdlib.h>
#include <string.h>
#include <stdio.h>

typedef struct {
  int initialized;
  int prepared;
  int validated;
  int running;
  int reset_count;
  double sim_time;
  char scenario[128];
  char ew_status[256];
  char mission_status[256];
} SalModel;

void* sal_create(){ SalModel*m=(SalModel*)calloc(1,sizeof(SalModel)); strcpy(m->scenario,"SC-COA-01"); strcpy(m->ew_status,"{\"jamLevel\":75,\"schema\":\"EW.Status.v2.1\"}"); strcpy(m->mission_status,"{\"state\":\"READY\"}"); return m; }
void sal_destroy(void* h){ free(h); }
int sal_initialize(void* h){ if(!h)return 3; SalModel*m=h; m->initialized=1; m->prepared=0; m->validated=0; m->running=0; m->sim_time=0; return 0; }
int sal_prepare_data(void* h,const char* init_json){ if(!h)return 3; SalModel*m=h; if(!m->initialized)return 2; (void)init_json; m->prepared=1; return 0; }
int sal_validate(void* h,char* err,size_t n){ if(!h)return 3; SalModel*m=h; if(!m->prepared){snprintf(err,n,"not prepared");return 2;} m->validated=1; if(n)err[0]=0; return 0; }
int sal_is_prepared(void* h){ if(!h)return 0; SalModel*m=h; return m->initialized&&m->prepared&&m->validated; }
int sal_start(void* h){ if(!h)return 3; SalModel*m=h; if(!sal_is_prepared(h))return 2; m->running=1; strcpy(m->mission_status,"{\"state\":\"RUNNING\"}"); return 0; }
int sal_step(void* h,double dt){ if(!h)return 3; SalModel*m=h; if(!m->running)return 2; m->sim_time+=dt; return 0; }
int sal_reset(void* h){ if(!h)return 3; SalModel*m=h; m->reset_count++; m->initialized=0;m->prepared=0;m->validated=0;m->running=0;m->sim_time=0; strcpy(m->scenario,"SC-COA-01"); strcpy(m->ew_status,"{\"jamLevel\":75,\"schema\":\"EW.Status.v2.1\"}"); strcpy(m->mission_status,"{\"state\":\"READY\"}"); return 0; }
int sal_get_status(void* h){ if(!h)return -1; SalModel*m=h; if(m->running)return 2; if(sal_is_prepared(h))return 1; return 0; }
double sal_get_sim_time(void* h){ return h?((SalModel*)h)->sim_time:-1; }
int sal_get_scenario_name(void* h,char*out,size_t n){ if(!h||!out||!n)return 3; snprintf(out,n,"%s",((SalModel*)h)->scenario); return 0; }
int sal_publish_topic(void* h,const char* topic,const char* json){ if(!h||!topic||!json)return 3; SalModel*m=h; if(strcmp(topic,"EW.Status")==0){snprintf(m->ew_status,sizeof(m->ew_status),"%s",json);return 0;} if(strcmp(topic,"Mission.Status")==0){snprintf(m->mission_status,sizeof(m->mission_status),"%s",json);return 0;} return 2; }
int sal_query_topic(void* h,const char* topic,char*out,size_t n){ if(!h||!topic||!out||!n)return 3; SalModel*m=h; if(strcmp(topic,"EW.Status")==0){snprintf(out,n,"%s",m->ew_status);return 0;} if(strcmp(topic,"Mission.Status")==0){snprintf(out,n,"%s",m->mission_status);return 0;} return 2; }
