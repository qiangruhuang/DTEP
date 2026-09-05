#include "openeaagles/simulation/Simulation.hpp"
#include "openeaagles/base/Pair.hpp"
#include "openeaagles/base/edl_parser.hpp"
#include "openeaagles/base/safe_ptr.hpp"
#include "openeaagles/simulation/factory.hpp"
#include "openeaagles/models/factory.hpp"
#include "openeaagles/base/factory.hpp"
#include "openeaagles/models/player/Player.hpp"
#include "openeaagles/models/system/OnboardComputer.hpp"
#include "openeaagles/models/system/TrackManager.hpp"
#include "openeaagles/models/Track.hpp"

#include <algorithm>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

namespace {

oe::base::Object* factory(const std::string& name)
{
    oe::base::Object* obj = oe::simulation::factory(name);
    if (obj == nullptr) obj = oe::models::factory(name);
    if (obj == nullptr) obj = oe::base::factory(name);
    return obj;
}

oe::simulation::Simulation* buildSimulation(const std::string& filename)
{
    unsigned int numErrors = 0;
    oe::base::Object* obj = oe::base::edl_parser(filename, factory, &numErrors);
    if (numErrors > 0 || obj == nullptr) {
        std::cerr << "EDL_PARSE_ERROR errors=" << numErrors << std::endl;
        std::exit(EXIT_FAILURE);
    }

    const auto pair = dynamic_cast<oe::base::Pair*>(obj);
    if (pair != nullptr) {
        obj = pair->object();
        obj->ref();
        pair->unref();
    }

    const auto simulation = dynamic_cast<oe::simulation::Simulation*>(obj);
    if (simulation == nullptr) {
        std::cerr << "EDL_NOT_SIMULATION" << std::endl;
        std::exit(EXIT_FAILURE);
    }
    return simulation;
}

void emitSnapshot(oe::simulation::Simulation* simulation, const unsigned int frame)
{
    auto* abstractOwnship = simulation->findPlayerByName("ownship");
    auto* ownship = dynamic_cast<oe::models::Player*>(abstractOwnship);
    if (ownship == nullptr) {
        std::cerr << "OWNSHIP_NOT_FOUND" << std::endl;
        std::exit(EXIT_FAILURE);
    }

    auto* obc = ownship->getOnboardComputer();
    if (obc == nullptr) {
        std::cerr << "OBC_NOT_FOUND" << std::endl;
        std::exit(EXIT_FAILURE);
    }

    auto* tm = obc->getTrackManagerByName("twsTrkMgr");
    if (tm == nullptr) {
        std::cerr << "TRACK_MANAGER_NOT_FOUND" << std::endl;
        std::exit(EXIT_FAILURE);
    }

    oe::base::safe_ptr<oe::models::Track> trackRefs[128];
    const int n = tm->getTrackList(trackRefs, 128);
    std::vector<const oe::models::Track*> tracks;
    tracks.reserve(n > 0 ? static_cast<std::size_t>(n) : 0U);
    for (int i = 0; i < n; ++i) {
        const oe::models::Track* p = trackRefs[i];
        if (p != nullptr) tracks.push_back(p);
    }
    std::sort(tracks.begin(), tracks.end(), [](const oe::models::Track* a, const oe::models::Track* b) {
        return a->getTrackID() < b->getTrackID();
    });

    std::cout << "S\t" << frame << "\t" << tracks.size() << '\n';
    for (const auto* track : tracks) {
        const auto* rfTrack = dynamic_cast<const oe::models::RfTrack*>(track);
        const double avgSignal = rfTrack != nullptr ? rfTrack->getAvgSignal() : 0.0;
        std::cout
            << "T\t" << frame
            << '\t' << track->getTrackID()
            << '\t' << track->getRange()
            << '\t' << track->getRangeRate()
            << '\t' << track->getRelAzimuthR()
            << '\t' << track->getElevationR()
            << '\t' << track->getQuality()
            << '\t' << avgSignal
            << '\n';
    }
}

} // namespace

int main(int argc, char* argv[])
{
    std::string config;
    unsigned int frames = 500;
    for (int i = 1; i < argc; ++i) {
        const std::string arg(argv[i]);
        if (arg == "--config" && i + 1 < argc) config = argv[++i];
        else if (arg == "--frames" && i + 1 < argc) frames = static_cast<unsigned int>(std::stoul(argv[++i]));
    }
    if (config.empty()) {
        std::cerr << "usage: oe_tws_probe --config scenario.edl [--frames N]" << std::endl;
        return EXIT_FAILURE;
    }

    auto* simulation = buildSimulation(config);
    simulation->reset();

    constexpr double dt = 1.0 / 50.0;
    std::cout << std::setprecision(17);
    std::cout << "META\tdt\t" << dt << "\tframes\t" << frames << '\n';

    for (unsigned int frame = 0; frame < frames; ++frame) {
        simulation->tcFrame(dt);
        simulation->updateData(dt);
        emitSnapshot(simulation, frame);
    }

    simulation->event(SHUTDOWN_EVENT);
    simulation->unref();
    return EXIT_SUCCESS;
}
