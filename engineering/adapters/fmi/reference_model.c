#include <stdlib.h>
#include <string.h>
#include <stddef.h>

typedef void* fmi2Component;
typedef const char* fmi2String;
typedef double fmi2Real;
typedef int fmi2Integer;
typedef int fmi2Boolean;
typedef unsigned int fmi2ValueReference;
typedef unsigned char fmi2Byte;
typedef enum { fmi2OK=0, fmi2Warning=1, fmi2Discard=2, fmi2Error=3, fmi2Fatal=4, fmi2Pending=5 } fmi2Status;
typedef enum { fmi2ModelExchange=0, fmi2CoSimulation=1 } fmi2Type;
typedef void (*fmi2CallbackLogger)(fmi2Component, fmi2String, fmi2Status, fmi2String, fmi2String, ...);
typedef void* (*fmi2CallbackAllocateMemory)(size_t, size_t);
typedef void (*fmi2CallbackFreeMemory)(void*);
typedef void (*fmi2StepFinished)(fmi2Component, fmi2Status);
typedef struct { fmi2CallbackLogger logger; fmi2CallbackAllocateMemory allocateMemory; fmi2CallbackFreeMemory freeMemory; fmi2StepFinished stepFinished; void* componentEnvironment; } fmi2CallbackFunctions;

typedef struct { double u; double y; double t; int initialized; } Model;

const char* fmi2GetTypesPlatform(void){ return "default"; }
const char* fmi2GetVersion(void){ return "2.0"; }

fmi2Component fmi2Instantiate(fmi2String instanceName, fmi2Type fmuType, fmi2String guid, fmi2String resource, const fmi2CallbackFunctions* cb, fmi2Boolean visible, fmi2Boolean loggingOn){
  (void)instanceName; (void)guid; (void)resource; (void)cb; (void)visible; (void)loggingOn;
  if(fmuType != fmi2CoSimulation) return NULL;
  Model* m=(Model*)calloc(1,sizeof(Model)); if(!m) return NULL; m->u=1.0; return (fmi2Component)m;
}
void fmi2FreeInstance(fmi2Component c){ free(c); }
fmi2Status fmi2SetupExperiment(fmi2Component c, fmi2Boolean td, fmi2Real tol, fmi2Real start, fmi2Boolean sd, fmi2Real stop){ (void)td;(void)tol;(void)sd;(void)stop; if(!c)return fmi2Error; ((Model*)c)->t=start; return fmi2OK; }
fmi2Status fmi2EnterInitializationMode(fmi2Component c){ return c?fmi2OK:fmi2Error; }
fmi2Status fmi2ExitInitializationMode(fmi2Component c){ if(!c)return fmi2Error; ((Model*)c)->initialized=1; return fmi2OK; }
fmi2Status fmi2Terminate(fmi2Component c){ return c?fmi2OK:fmi2Error; }
fmi2Status fmi2Reset(fmi2Component c){ if(!c)return fmi2Error; Model*m=(Model*)c;m->u=1.0;m->y=0.0;m->t=0.0;m->initialized=0;return fmi2OK; }
fmi2Status fmi2DoStep(fmi2Component c, fmi2Real current, fmi2Real step, fmi2Boolean noSet){ (void)noSet; if(!c||!((Model*)c)->initialized)return fmi2Error; Model*m=(Model*)c; m->y += m->u*step; m->t=current+step; return fmi2OK; }
fmi2Status fmi2SetReal(fmi2Component c,const fmi2ValueReference vr[],size_t n,const fmi2Real value[]){ if(!c)return fmi2Error;Model*m=(Model*)c;for(size_t i=0;i<n;i++){if(vr[i]==0)m->u=value[i];else if(vr[i]==1)m->y=value[i];else return fmi2Error;}return fmi2OK; }
fmi2Status fmi2GetReal(fmi2Component c,const fmi2ValueReference vr[],size_t n,fmi2Real value[]){ if(!c)return fmi2Error;Model*m=(Model*)c;for(size_t i=0;i<n;i++){if(vr[i]==0)value[i]=m->u;else if(vr[i]==1)value[i]=m->y;else return fmi2Error;}return fmi2OK; }
fmi2Status fmi2SetInteger(fmi2Component c,const fmi2ValueReference vr[],size_t n,const fmi2Integer v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
fmi2Status fmi2GetInteger(fmi2Component c,const fmi2ValueReference vr[],size_t n,fmi2Integer v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
fmi2Status fmi2SetBoolean(fmi2Component c,const fmi2ValueReference vr[],size_t n,const fmi2Boolean v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
fmi2Status fmi2GetBoolean(fmi2Component c,const fmi2ValueReference vr[],size_t n,fmi2Boolean v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
fmi2Status fmi2SetString(fmi2Component c,const fmi2ValueReference vr[],size_t n,const fmi2String v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
fmi2Status fmi2GetString(fmi2Component c,const fmi2ValueReference vr[],size_t n,fmi2String v[]){(void)c;(void)vr;(void)n;(void)v;return fmi2Error;}
